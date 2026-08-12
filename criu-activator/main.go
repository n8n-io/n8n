// criu-activator milestone 2: scale-to-zero proxy for n8n.
//
// The activator (PID 1, root) owns :5678. n8n listens internally on :5680.
// n8n starts, gets dumped once healthy, and stays dumped until a request
// arrives; then it's restored, the request is proxied, and after idleTimeout
// with no in-flight requests it's dumped again.
package main

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

const (
	listenAddr = ":5678"
	n8nPort    = "5680"
	n8nURL     = "http://127.0.0.1:" + n8nPort
	imgDir     = "/tmp/n8n-img"
	n8nLog     = "/tmp/n8n.log"
)

var idleTimeout = 10 * time.Second

var criuFlags = []string{"--tcp-established", "--file-locks", "--ext-unix-sk"}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "child" {
		childStage()
		return
	}
	if v := os.Getenv("IDLE_TIMEOUT"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			fatal("bad IDLE_TIMEOUT %q: %v", v, err)
		}
		idleTimeout = d
	}
	supervisor()
}

// --- child stage: seccomp-deny io_uring_setup, then exec n8n ------------

// childStage installs a seccomp filter denying io_uring_setup (privileged
// containers run seccomp-unconfined, so node would create io_uring rings
// that criu cannot dump), then execs n8n in place.
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

// --- supervisor ----------------------------------------------------------

type state int

const (
	running state = iota
	dumped
)

type supervisorState struct {
	mu           sync.Mutex
	state        state
	pid          int
	inflight     int
	lastActivity time.Time
}

var sup supervisorState

func supervisor() {
	logf("starting n8n (idle timeout %v)", idleTimeout)
	pid, err := startN8N()
	if err != nil {
		fatal("start n8n: %v", err)
	}
	sup.pid = pid
	sup.state = running
	sup.lastActivity = time.Now()
	waitHealthy(120 * time.Second)
	logf("n8n healthy (pid %d), dumping until first request", pid)

	sup.mu.Lock()
	if err := dumpLocked(); err != nil {
		sup.mu.Unlock()
		fatal("initial dump: %v\n--- dump.log tail ---\n%s", err, tail(imgDir+"/dump.log", 4000))
	}
	sup.mu.Unlock()

	go idleWatcher()

	target, _ := url.Parse(n8nURL)
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.FlushInterval = -1 // stream SSE/push immediately
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		logf("proxy error for %s %s: %v", r.Method, r.URL.Path, err)
		http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := ensureRunningAndTrack(); err != nil {
			logf("wake failed for %s %s: %v\n--- restore.log tail ---\n%s", r.Method, r.URL.Path, err, tail(imgDir+"/restore.log", 4000))
			http.Error(w, "restore failed: "+err.Error(), http.StatusServiceUnavailable)
			return
		}
		defer requestDone()
		proxy.ServeHTTP(w, r)
	})

	logf("proxy listening on %s", listenAddr)
	if err := http.ListenAndServe(listenAddr, handler); err != nil {
		fatal("listen: %v", err)
	}
}

// ensureRunningAndTrack restores n8n if dumped and registers an in-flight
// request. Concurrent requests during a restore queue on the mutex; the
// first one pays the restore, the rest see state==running.
func ensureRunningAndTrack() error {
	sup.mu.Lock()
	defer sup.mu.Unlock()
	if sup.state == dumped {
		t := time.Now()
		if err := restoreLocked(); err != nil {
			return err
		}
		logf("restored on demand in %v", time.Since(t).Round(time.Millisecond))
	}
	sup.inflight++
	sup.lastActivity = time.Now()
	return nil
}

func requestDone() {
	sup.mu.Lock()
	sup.inflight--
	sup.lastActivity = time.Now()
	sup.mu.Unlock()
}

func idleWatcher() {
	for range time.Tick(time.Second) {
		sup.mu.Lock()
		if sup.state == running && sup.inflight == 0 && time.Since(sup.lastActivity) > idleTimeout {
			t := time.Now()
			if err := dumpLocked(); err != nil {
				sup.mu.Unlock()
				fatal("idle dump: %v\n--- dump.log tail ---\n%s", err, tail(imgDir+"/dump.log", 4000))
			}
			logf("idle %v → dumped in %v (image %s)", idleTimeout, time.Since(t).Round(time.Millisecond), duSh(imgDir))
		}
		sup.mu.Unlock()
	}
}

// dumpLocked checkpoints the n8n tree and kills it. Caller holds sup.mu.
func dumpLocked() error {
	os.RemoveAll(imgDir)
	if err := os.MkdirAll(imgDir, 0o755); err != nil {
		return err
	}
	args := append([]string{"dump", "-t", fmt.Sprint(sup.pid), "-D", imgDir, "-o", "dump.log"}, criuFlags...)
	if err := runCriu(args); err != nil {
		return err
	}
	reapAll()
	sup.state = dumped
	return nil
}

// restoreLocked restores the n8n tree and waits for it to serve. Caller holds sup.mu.
func restoreLocked() error {
	args := append([]string{"restore", "-d", "-D", imgDir, "-o", "restore.log"}, criuFlags...)
	if err := runCriu(args); err != nil {
		return err
	}
	sup.state = running
	waitHealthy(30 * time.Second)
	return nil
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
		"N8N_PORT="+n8nPort,
		"N8N_LISTEN_ADDRESS=127.0.0.1",  // only the activator proxy is reachable from outside
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
		resp, err := client.Get(n8nURL + "/healthz")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return
			}
		}
		time.Sleep(50 * time.Millisecond)
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
