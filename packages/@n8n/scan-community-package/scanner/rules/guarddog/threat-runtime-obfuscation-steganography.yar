rule threat_runtime_obfuscation_steganography
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects steganography decode followed by code execution"
        identifies = "threat.runtime.obfuscation.steganography"
        severity = "high"
        mitre_tactics = "defense-evasion"
        specificity = "low"
        sophistication = "high"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"
    strings:
        // Python - steganography libraries
        $py_stego_decode = "steganography.decode(" nocase
        $py_lsb_reveal = "lsb.reveal(" nocase
        $py_stegano = "stegano" nocase
        // bare exec(/eval( builtins, not ast.literal_eval()/img.eval() method calls
        $py_exec = /[^.\w]exec\s*\(/ nocase
        $py_eval = /[^.\w]eval\s*\(/ nocase

        // JavaScript/Node.js - steganography
        $js_steggy = "steggy.reveal(" nocase
        $js_stego = "stego.decode(" nocase
        $js_jimp = "Jimp.read(" nocase
        $js_getpixel = "getPixelColor(" nocase
        $js_buffer_concat = "Buffer.concat(" nocase
        $js_eval = "eval(" nocase

        // Image file references in code
        $img_png = /\.(png|jpg|jpeg|gif|bmp)['"]/ nocase

    condition:
        (any of ($py_stego_decode, $py_lsb_reveal, $py_stegano) and $img_png and ($py_exec or $py_eval)) or
        (any of ($js_*) and $img_png and $js_eval)
}
