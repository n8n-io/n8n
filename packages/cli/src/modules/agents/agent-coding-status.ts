// Keep Git and process inspection in one sandbox request.
export const CODING_STOP_SCRIPT = `import os, pathlib, signal, sys, time
global_meta, current_meta, all_apps = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3] == 'all'
metas = [global_meta, *[p.parent for p in (global_meta / 'sessions').glob('*/app.pid')]] if all_apps else [current_meta]
for meta in metas:
    if all_apps and meta == current_meta: continue
    pid_file = meta / 'app.pid'
    if not pid_file.exists(): continue
    try:
        pid = int(pid_file.read_text())
        if pid <= 1: continue
        if not (meta / 'app.exit').exists() and not (meta / 'app.stopped').exists():
            os.killpg(pid, signal.SIGTERM)
            for attempt in range(20):
                time.sleep(0.1)
                try: os.killpg(pid, 0)
                except ProcessLookupError: break
            else: os.killpg(pid, signal.SIGKILL)
    except (ValueError, ProcessLookupError): pass
    (meta / 'app.stopped').write_text('stopped')`;

export const CODING_STATUS_SCRIPT = `import json, os, pathlib, subprocess, sys, urllib.request
workspace, port, probe_path, mode, session_id = pathlib.Path(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
global_meta = workspace / '.coding'
def read(meta, name):
    try: return (meta / name).read_text().strip()
    except FileNotFoundError: return ''
def exit_code(meta, name):
    value = read(meta, name + '.exit')
    return int(value) if value else None
def alive(meta, name):
    if exit_code(meta, name) is not None or read(meta, name + '.stopped'): return False
    try:
        os.kill(int(read(meta, name + '.pid')), 0)
        return True
    except (ValueError, ProcessLookupError, PermissionError): return False
def git(repo, *args):
    return subprocess.run(['git', '-C', str(repo), *args], capture_output=True).stdout.decode('utf-8', 'replace')
def status(session=None):
    meta = global_meta if not session or session['original'] else global_meta / 'sessions' / session['id']
    repo = workspace / 'repo' if not session or session['original'] else meta / 'repo'
    base = session['baseCommit'] if session else 'HEAD'
    setup_exit, check_exit = exit_code(meta, 'setup'), exit_code(meta, 'check')
    phase = 'not_started'
    if alive(meta, 'setup'): phase = read(meta, 'stage') or 'installing'
    elif setup_exit is not None: phase = 'ready' if setup_exit == 0 else 'error'
    elif (repo / '.git').exists(): phase = 'ready'
    changes = {}
    entries = iter(git(repo, 'diff', '--no-ext-diff', '--no-renames', '--name-status', '-z', base, '--').split('\\0'))
    for change in entries:
        if change:
            path = next(entries, '')
            changes[path] = {'path': path, 'status': change, 'additions': 0, 'deletions': 0}
    for entry in git(repo, 'diff', '--no-ext-diff', '--no-renames', '--numstat', '-z', base, '--').split('\\0'):
        parts = entry.split('\\t', 2)
        if len(parts) == 3 and parts[2] in changes:
            changes[parts[2]].update(additions=int(parts[0]) if parts[0].isdigit() else 0, deletions=int(parts[1]) if parts[1].isdigit() else 0)
    for path in git(repo, 'ls-files', '--others', '--exclude-standard', '-z').split('\\0'):
        if not path: continue
        additions = 0
        try:
            target = repo / path
            if target.is_file() and not target.is_symlink() and target.stat().st_size <= 1048576:
                data = target.read_bytes()
                if b'\\0' not in data: additions = len(data.splitlines())
        except OSError: pass
        changes[path] = {'path': path, 'status': '??', 'additions': additions, 'deletions': 0}
    dirty = git(repo, 'status', '--porcelain=v1', '--untracked-files=all', '--no-renames', '-z')
    app = 'stopped'
    if alive(meta, 'app'):
        app = 'starting'
        try:
            urllib.request.urlopen('http://127.0.0.1:' + str(port) + probe_path, timeout=1).close()
            app = 'running'
        except Exception: pass
    elif exit_code(meta, 'app') not in (None, 0) and not read(meta, 'app.stopped'): app = 'error'
    check = 'not_started'
    if alive(meta, 'check'): check = 'running'
    elif check_exit is not None: check = 'passed' if check_exit == 0 else 'failed'
    return {'phase': phase, 'branch': git(repo, 'branch', '--show-current').strip(), 'changes': sorted(changes.values(), key=lambda c: c['path']),
        'uncommittedChanges': len([entry for entry in dirty.split('\\0') if entry]), 'uncommittedPaths': [entry[3:] for entry in dirty.split('\\0') if entry], 'app': app, 'check': check,
        'setupExitCode': setup_exit, 'checkExitCode': check_exit}
if mode == 'sessions':
    sessions = []
    for path in sorted((global_meta / 'sessions').glob('*/session.json')):
        session = json.loads(path.read_text())
        if 'worktreeId' in session: continue
        if session['id'] != path.parent.name: continue
        sessions.append({**session, 'status': status(session)})
    branches = git(workspace / 'repo', 'for-each-ref', '--format=%(refname:short)', 'refs/heads/', 'refs/remotes/origin/').splitlines()
    print(json.dumps({'sessions': sessions, 'branches': [b for b in branches if b != 'origin/HEAD']}))
else:
    session = json.loads((global_meta / 'sessions' / session_id / 'session.json').read_text()) if session_id else None
    print(json.dumps(status(session)))`;
