rule capability_process_spawn
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects process execution and spawning"
        identifies = "capability.process.spawn"
        severity = "low"
        specificity = "low"
        sophistication = "low"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go,*.rb,*.gemspec,*.rs,extconf.rb,*/extconf.rb,Rakefile,*/Rakefile"
    strings:
        // Python - subprocess
        $py_subprocess_call = /subprocess\.(call|run|check_call|check_output|Popen)/ nocase
        $py_os_system = "os.system(" nocase
        $py_os_popen = "os.popen(" nocase
        $py_os_spawn = /os\.(spawn|exec)/ nocase
        $py_exec = /\bexec\s*\(\s*[a-zA-Z_'"(]/ nocase
        $py_eval = /\beval\s*\(\s*[a-zA-Z_'"(]/ nocase

        // JavaScript/Node.js - child_process (both direct and destructured)
        $js_child_process = /child_process\.(exec|execSync|spawn|spawnSync|fork|execFile)/ nocase
        $js_require_child_process = /require\s*\(\s*['"]child_process['"]\s*\)/ nocase
        $js_spawn_destructure = /\{\s*(exec|execSync|spawn|spawnSync|fork|execFile)\s*\}\s*=\s*require/ nocase
        $js_eval = /(^|\s|\()eval\s*\(/ nocase
        $js_function = "new Function(" nocase

        // Go - exec
        $go_exec_command = "exec.Command(" nocase
        $go_exec_commandcontext = "exec.CommandContext(" nocase
        $go_os_startprocess = "os.StartProcess(" nocase

        // Rust - std::process::Command
        $rs_command_new = /\bCommand\s*::\s*new\s*\(/

        // Ruby - Kernel methods for command execution
        $rb_system = /\bsystem\s*\(/ nocase
        $rb_exec = /\bexec\s*\(/ nocase
        $rb_spawn = /\bspawn\s*\(/ nocase
        $rb_kernel_system = /\bKernel\s*\.\s*system\s*\(/ nocase
        $rb_kernel_exec = /\bKernel\s*\.\s*exec\s*\(/ nocase
        $rb_kernel_spawn = /\bKernel\s*\.\s*spawn\s*\(/ nocase

        // Ruby - %x{} command execution
        $rb_percent_x = /%x[\{\[\(]/ nocase

        // Ruby - Open3 module
        $rb_open3_capture2 = /\bOpen3\s*\.\s*capture2/ nocase
        $rb_open3_capture2e = /\bOpen3\s*\.\s*capture2e/ nocase
        $rb_open3_capture3 = /\bOpen3\s*\.\s*capture3/ nocase
        $rb_open3_pipeline = /\bOpen3\s*\.\s*pipeline/ nocase
        $rb_open3_popen = /\bOpen3\s*\.\s*popen/ nocase

        // Ruby - IO.popen
        $rb_io_popen = /\bIO\s*\.\s*popen\s*\(/ nocase

        // Ruby - Process methods
        $rb_process_spawn = /\bProcess\s*\.\s*spawn\s*\(/ nocase
        $rb_process_exec = /\bProcess\s*\.\s*exec\s*\(/ nocase

        // Ruby - PTY.spawn
        $rb_pty_spawn = /\bPTY\s*\.\s*spawn\s*\(/ nocase

        // Ruby - eval methods (dynamic code execution)
        $rb_eval = /\beval\s*\(/ nocase
        $rb_instance_eval = /\binstance_eval\s*\(/ nocase
        $rb_class_eval = /\bclass_eval\s*\(/ nocase
        $rb_module_eval = /\bmodule_eval\s*\(/ nocase

    condition:
        any of them
}
