rule capability_process_schedule
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects ability to create scheduled tasks (cron, at, schtasks)"
        identifies = "capability.process.schedule"
        severity = "medium"
        specificity = "low"
        sophistication = "low"
        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Python - cron manipulation
        $py_crontab_lib = "from crontab import" nocase
        $py_crontab_new = "CronTab(" nocase
        $py_cron_new = "cron.new(" nocase
        $py_etc_crontab = "/etc/crontab" nocase
        $py_cron_d = "/etc/cron.d/" nocase
        $py_user_crontab = "crontab -" nocase

        // Python - at command
        $py_at_cmd = /subprocess\.[^(]*\([^)]*['"]at\s/ nocase

        // Python - systemd timers
        $py_systemd_timer = ".timer" nocase
        $py_systemd_timers_dir = "/etc/systemd/system/" nocase

        // Node.js - cron libraries
        $js_node_cron = "node-cron" nocase
        $js_cron_require = "require('cron')" nocase
        $js_cronjob = "new CronJob(" nocase
        $js_node_schedule = "node-schedule" nocase
        $js_schedule_job = "scheduleJob(" nocase

        // Node.js - executing cron commands
        $js_crontab_exec = /(exec|spawn)\([^)]*['"]crontab/ nocase
        $js_at_exec = /(exec|spawn)\([^)]*['"]at\s/ nocase

        // Windows scheduled tasks (less common but possible in Node.js)
        $win_schtasks = "schtasks" nocase
        $win_task_scheduler = "Task Scheduler" nocase

    condition:
        any of them
}
