// criu-activator milestone 1: run n8n 1s → criu dump → wait 5s → restore → repeat.
// Runs as PID 1 (root) in a privileged container with criu installed.
package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"syscall"
	"time"
	"unsafe"
)

const (
	healthzURL = "http://127.0.0.1:5678/healthz"
	imgDir     = "/tmp/n8n-img"
	n8nLog     = "/tmp/n8n.log"
	runFor     = 1 * time.Second
	pauseFor   = 5 * time.Second
)

var criuFlags = []string{"--tcp-established", "--file-locks", "--ext-unix-sk"}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "child" {
		childStage()
		return
	}
	supervisor()
}

// childStage: install seccomp filter denying io_uring_setup (privileged
// containers run seccomp-unconfined, so node would create io_uring rings
// that criu cannot dump), then exec n8n in place.
func childStage() {
	runtime.LockOSThread() // execve inherits the calling thread's seccomp filter
	if err := installIoUringDeny(); err != nil {
		fmt.Fprintln(os.Stderr, "seccomp:", err)
		os.Exit(1)
	}
	n8n, err := exec.LookPath("n8n")
	if err != nil {
		fmt.Fprintln(os.Stderr, "n8n not in PATH:", err)
		os.Exit(1)
	}
	if err := syscall.Exec(n8n, []string{"n8n"}, os.Environ()); err != nil {
		fmt.Fprintln(os.Stderr, "exec n8n:", err)
		os.Exit(1)
	}
}

type sockFilter struct {
	Code uint16
	Jt   uint8
	Jf   uint8
	K    uint32
}

type sockFprog struct {
	Len    uint16
	_      [6]byte
	Filter *sockFilter
}

func installIoUringDeny() error {
	const (
		auditArchX86_64 = 0xC000003E
		nrIoUringSetup  = 425
		retErrnoEnosys  = 0x00050000 | 38 // SECCOMP_RET_ERRNO | ENOSYS
		retAllow        = 0x7fff0000
		prSetSeccomp    = 22
		modeFilter      = 2
	)
	filter := []sockFilter{
		{0x20, 0, 0, 4},               // ld arch
		{0x15, 0, 3, auditArchX86_64}, // arch != x86_64 → allow
		{0x20, 0, 0, 0},               // ld syscall nr
		{0x15, 0, 1, nrIoUringSetup},  // nr != io_uring_setup → allow
		{0x06, 0, 0, retErrnoEnosys},  // deny with ENOSYS
		{0x06, 0, 0, retAllow},        // allow
	}
	prog := sockFprog{Len: uint16(len(filter)), Filter: &filter[0]}
	// no PR_SET_NO_NEW_PRIVS needed: we hold CAP_SYS_ADMIN
	if _, _, errno := syscall.RawSyscall(syscall.SYS_PRCTL, prSetSeccomp, modeFilter, uintptr(unsafe.Pointer(&prog))); errno != 0 {
		return errno
	}
	return nil
}

func supervisor() {
	logf("starting n8n")
	pid, err := startN8N()
	if err != nil {
		fatal("start n8n: %v", err)
	}
	logf("n8n pid=%d, waiting for healthz", pid)
	waitHealthy(120 * time.Second)
	logf("n8n healthy")

	for cycle := 1; ; cycle++ {
		time.Sleep(runFor)

		t := time.Now()
		if err := dump(pid); err != nil {
			fatal("cycle %d dump: %v\n--- dump.log tail ---\n%s", cycle, err, tail(imgDir+"/dump.log", 4000))
		}
		reapAll()
		logf("cycle %d: dumped in %v (image %s)", cycle, time.Since(t).Round(time.Millisecond), duSh(imgDir))

		time.Sleep(pauseFor)

		t = time.Now()
		if err := restore(); err != nil {
			fatal("cycle %d restore: %v\n--- restore.log tail ---\n%s", cycle, err, tail(imgDir+"/restore.log", 4000))
		}
		waitHealthy(30 * time.Second)
		logf("cycle %d: restored to healthy in %v", cycle, time.Since(t).Round(time.Millisecond))
	}
}

func startN8N() (int, error) {
	logFile, err := os.OpenFile(n8nLog, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return 0, err
	}
	devNull, err := os.Open(os.DevNull)
	if err != nil {
		return 0, err
	}
	cmd := exec.Command("/proc/self/exe", "child")
	// plain-file stdio: pipes to the docker log collector would be external
	// fds criu can't restore
	cmd.Stdin = devNull
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	cmd.Env = append(os.Environ(),
		"N8N_DIAGNOSTICS_ENABLED=false", // fewer outbound sockets at dump time
		"N8N_VERSION_NOTIFICATIONS_ENABLED=false",
	)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true} // criu wants the tree root to lead a session
	if err := cmd.Start(); err != nil {
		return 0, err
	}
	pid := cmd.Process.Pid
	go cmd.Wait() // reap the direct child when the first dump kills it
	return pid, nil
}

func dump(pid int) error {
	os.RemoveAll(imgDir)
	if err := os.MkdirAll(imgDir, 0o755); err != nil {
		return err
	}
	args := append([]string{"dump", "-t", fmt.Sprint(pid), "-D", imgDir, "-o", "dump.log"}, criuFlags...)
	return runCriu(args)
}

func restore() error {
	args := append([]string{"restore", "-d", "-D", imgDir, "-o", "restore.log"}, criuFlags...)
	return runCriu(args)
}

func runCriu(args []string) error {
	cmd := exec.Command("criu", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// reapAll collects zombies reparented to us (PID 1): after a dump kills the
// n8n tree, members whose parent died land here.
func reapAll() {
	for {
		var ws syscall.WaitStatus
		pid, err := syscall.Wait4(-1, &ws, syscall.WNOHANG, nil)
		if pid <= 0 || err != nil {
			return
		}
	}
}

func waitHealthy(timeout time.Duration) {
	client := &http.Client{Timeout: 500 * time.Millisecond}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		resp, err := client.Get(healthzURL)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	fatal("healthz not ok within %v; n8n log tail:\n%s", timeout, tail(n8nLog, 2000))
}

func duSh(dir string) string {
	out, err := exec.Command("du", "-sh", dir).Output()
	if err != nil || len(out) == 0 {
		return "?"
	}
	return string(out[:len(out)-1])
}

func tail(path string, n int64) string {
	f, err := os.Open(path)
	if err != nil {
		return err.Error()
	}
	defer f.Close()
	st, _ := f.Stat()
	if st.Size() > n {
		f.Seek(-n, 2)
	}
	buf := make([]byte, n)
	read, _ := f.Read(buf)
	return string(buf[:read])
}

func logf(format string, a ...any) {
	fmt.Printf("[activator %s] %s\n", time.Now().Format("15:04:05.000"), fmt.Sprintf(format, a...))
}

func fatal(format string, a ...any) {
	logf("FATAL: "+format, a...)
	os.Exit(1)
}
