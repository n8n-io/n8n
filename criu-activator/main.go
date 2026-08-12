// criu-activator: scale-to-zero proxy for n8n.
//
// The activator (PID 1, root) owns :5678. n8n listens internally on :5690.
// n8n starts, gets dumped once healthy, and stays dumped until a request
// arrives; then it's restored, the request is proxied, and after idleTimeout
// with no in-flight requests it's dumped again. A periodic heartbeat
// (RESTORE_INTERVAL/RUN_DURATION) briefly wakes it so scheduled work can
// fire, and n8n's log file is streamed to stdout.
package main

import (
	"fmt"
	"io"
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
	// not 5680: the cloud task-runner-launcher sidecar's health-check server
	// binds 5680 in the shared pod network namespace (5679 = task broker)
	n8nPort = "5690"
	n8nURL  = "http://127.0.0.1:" + n8nPort
	imgDir  = "/tmp/n8n-img"
	n8nLog  = "/tmp/n8n.log"
)

var (
	idleTimeout = 10 * time.Second
	// periodic heartbeat: restore every restoreInterval, run for runDuration,
	// dump again (unless real traffic arrived) — lets schedule triggers fire
	// while the instance is otherwise suspended
	restoreInterval = 30 * time.Second
	runDuration     = 2 * time.Second
)

// --manage-cgroups=ignore: restored trees stay in the activator's current
// cgroup instead of the paths recorded at dump time, so they can never
// outlive the container (k8s restarts the container, not the pod netns)
var criuFlags = []string{"--tcp-established", "--file-locks", "--ext-unix-sk", "--manage-cgroups=ignore"}

func durFromEnv(dst *time.Duration, name string) {
	v := os.Getenv(name)
	if v == "" {
		return
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		fatal("bad %s %q: %v", name, v, err)
	}
	*dst = d
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "child" {
		childStage()
		return
	}
	durFromEnv(&idleTimeout, "IDLE_TIMEOUT")
	durFromEnv(&restoreInterval, "RESTORE_INTERVAL") // 0 disables the heartbeat
	durFromEnv(&runDuration, "RUN_DURATION")
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
	lastRequest  string // method+path of the newest real (non-passive) request
}

var sup supervisorState

// passiveRoutes are served from cache while n8n is dumped instead of waking
// it, so monitoring probes don't defeat scale-to-zero. While n8n runs they're
// forwarded (and re-cached) but don't count as activity for the idle timer.
var passiveRoutes = map[string]bool{
	"/healthz":           true,
	"/healthz/readiness": true,
	"/metrics":           true,
}

type cachedResponse struct {
	status      int
	contentType string
	body        []byte
	fetchedAt   time.Time
}

var respCache = map[string]*cachedResponse{} // guarded by sup.mu

func fetchRoute(path string) (*cachedResponse, error) {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(n8nURL + path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return &cachedResponse{resp.StatusCode, resp.Header.Get("Content-Type"), body, time.Now()}, nil
}

// refreshCacheLocked snapshots the passive routes from a running n8n.
// Caller holds sup.mu and guarantees state == running.
func refreshCacheLocked() {
	for path := range passiveRoutes {
		c, err := fetchRoute(path)
		if err != nil {
			logf("cache refresh %s: %v", path, err)
			continue
		}
		respCache[path] = c
	}
}

func writeCached(w http.ResponseWriter, c *cachedResponse, suspended bool) {
	if c.contentType != "" {
		w.Header().Set("Content-Type", c.contentType)
	}
	state := "running"
	if suspended {
		state = "suspended"
	}
	w.Header().Set("X-Activator-State", state)
	w.Header().Set("X-Activator-Cache-Age", time.Since(c.fetchedAt).Round(time.Millisecond).String())
	w.WriteHeader(c.status)
	w.Write(c.body)
}

// servePassive answers health/metrics without ever waking n8n: live (and
// re-cached) while running, from cache while dumped.
func servePassive(w http.ResponseWriter, r *http.Request) {
	sup.mu.Lock()
	if sup.state != running {
		cached := respCache[r.URL.Path]
		sup.mu.Unlock()
		if cached == nil {
			http.Error(w, "suspended and no cached response", http.StatusServiceUnavailable)
			return
		}
		writeCached(w, cached, true)
		return
	}
	sup.inflight++ // blocks dumps mid-request; deliberately no lastActivity update
	sup.mu.Unlock()

	c, err := fetchRoute(r.URL.Path)

	sup.mu.Lock()
	sup.inflight--
	if err == nil {
		respCache[r.URL.Path] = c
	}
	fallback := respCache[r.URL.Path]
	sup.mu.Unlock()

	if err != nil {
		if fallback == nil {
			http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
			return
		}
		writeCached(w, fallback, false)
		return
	}
	writeCached(w, c, false)
}

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
	// full readiness, not just /healthz: the initial cache snapshot must not
	// capture the "n8n is starting up" placeholder responses
	waitFor("/healthz/readiness", 120*time.Second)
	logf("n8n healthy (pid %d), dumping until first request", pid)

	sup.mu.Lock()
	refreshCacheLocked()
	if err := dumpLocked(); err != nil {
		sup.mu.Unlock()
		fatal("initial dump: %v\n--- dump.log tail ---\n%s", err, tail(imgDir+"/dump.log", 4000))
	}
	sup.mu.Unlock()

	go idleWatcher()
	go periodicWaker()
	go streamN8NLog()

	target, _ := url.Parse(n8nURL)
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.FlushInterval = -1 // stream SSE/push immediately
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		logf("proxy error for %s %s: %v", r.Method, r.URL.Path, err)
		http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && passiveRoutes[r.URL.Path] {
			servePassive(w, r)
			return
		}
		if err := ensureRunningAndTrack(r); err != nil {
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
func ensureRunningAndTrack(r *http.Request) error {
	sup.mu.Lock()
	defer sup.mu.Unlock()
	if sup.state == dumped {
		t := time.Now()
		if err := restoreLocked(); err != nil {
			return err
		}
		refreshCacheLocked()
		logf("restored on demand in %v (woken by %s %s)", time.Since(t).Round(time.Millisecond), r.Method, r.URL.Path)
	}
	sup.inflight++
	sup.lastActivity = time.Now()
	sup.lastRequest = r.Method + " " + r.URL.Path
	return nil
}

func requestDone() {
	sup.mu.Lock()
	sup.inflight--
	sup.lastActivity = time.Now()
	sup.mu.Unlock()
}

// periodicWaker restores a dumped n8n every restoreInterval and lets it run
// for runDuration so scheduled work (cron triggers, queued timers) can fire
// while the instance is otherwise suspended. If real traffic arrived during
// the window, the idle watcher takes over instead of dumping immediately.
func periodicWaker() {
	if restoreInterval <= 0 {
		return
	}
	for range time.Tick(restoreInterval) {
		sup.mu.Lock()
		if sup.state != dumped {
			sup.mu.Unlock()
			continue
		}
		t := time.Now()
		if err := restoreLocked(); err != nil {
			sup.mu.Unlock()
			fatal("periodic restore: %v\n--- restore.log tail ---\n%s", err, tail(imgDir+"/restore.log", 4000))
		}
		wokenAt := time.Now()
		logf("periodic restore in %v, running for %v", time.Since(t).Round(time.Millisecond), runDuration)
		sup.mu.Unlock()

		time.Sleep(runDuration)

		sup.mu.Lock()
		if sup.state == running && sup.inflight == 0 && !sup.lastActivity.After(wokenAt) {
			t = time.Now()
			refreshCacheLocked()
			if err := dumpLocked(); err != nil {
				sup.mu.Unlock()
				fatal("periodic dump: %v\n--- dump.log tail ---\n%s", err, tail(imgDir+"/dump.log", 4000))
			}
			logf("periodic run over → dumped in %v", time.Since(t).Round(time.Millisecond))
		} else {
			logf("periodic run extended by traffic (%s, %d in flight), idle watcher takes over", sup.lastRequest, sup.inflight)
		}
		sup.mu.Unlock()
	}
}

// streamN8NLog copies /tmp/n8n.log to the activator's stdout so pod logs
// carry n8n's output. The child can't write to stdout directly: its stdio
// must be a plain file for criu (log-collector pipes are external fds).
func streamN8NLog() {
	f, err := os.Open(n8nLog)
	if err != nil {
		logf("n8n log stream: %v", err)
		return
	}
	buf := make([]byte, 32*1024)
	for {
		n, err := f.Read(buf)
		if n > 0 {
			os.Stdout.Write(buf[:n])
		}
		if err == io.EOF {
			time.Sleep(200 * time.Millisecond)
			continue
		}
		if err != nil {
			logf("n8n log stream: %v", err)
			return
		}
	}
}

func idleWatcher() {
	for range time.Tick(time.Second) {
		sup.mu.Lock()
		if sup.state == running && sup.inflight == 0 && time.Since(sup.lastActivity) > idleTimeout {
			t := time.Now()
			refreshCacheLocked() // snapshot last live state before freezing
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
	sup.lastActivity = time.Now() // fresh idle clock — else the idle watcher kills the run window instantly
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
		"N8N_METRICS=true",              // expose /metrics so the passive cache has something to serve
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
	waitFor("/healthz", timeout)
}

func waitFor(path string, timeout time.Duration) {
	client := &http.Client{Timeout: 500 * time.Millisecond}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		resp, err := client.Get(n8nURL + path)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return
			}
		}
		time.Sleep(50 * time.Millisecond)
	}
	fatal("%s not ok within %v; n8n log tail:\n%s", path, timeout, tail(n8nLog, 2000))
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
