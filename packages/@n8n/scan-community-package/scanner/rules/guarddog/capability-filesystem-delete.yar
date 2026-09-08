rule capability_filesystem_delete
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects file/directory deletion capabilities"
        identifies = "capability.filesystem.delete"
        severity = "low"
        specificity = "low"
        sophistication = "low"
        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Python - deletion
        $py_os_remove = "os.remove(" nocase
        $py_os_unlink = "os.unlink(" nocase
        $py_os_rmdir = "os.rmdir(" nocase
        $py_shutil_rmtree = "shutil.rmtree(" nocase
        $py_path_unlink = ".unlink(" nocase

        // Node.js - deletion
        $js_fs_rm = "fs.rm(" nocase
        $js_fs_rmSync = "fs.rmSync(" nocase
        $js_fs_unlink = "fs.unlink(" nocase
        $js_fs_unlinkSync = "fs.unlinkSync(" nocase
        $js_rimraf = "rimraf" nocase

    condition:
        any of them
}
