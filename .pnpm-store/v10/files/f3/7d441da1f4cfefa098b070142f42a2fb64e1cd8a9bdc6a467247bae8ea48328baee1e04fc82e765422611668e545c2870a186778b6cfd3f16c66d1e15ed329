import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
    { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.worker } } },
    { files: ["test/**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.jest } },
    {
        "rules": {
            "indent": [
                "error",
                4,
                {
                    "SwitchCase": 1
                }
            ],
            "linebreak-style": [
                "error",
                "unix"
            ],
            "no-console": 0,
            "no-empty": [
                2,
                {
                    "allowEmptyCatch": true
                }
            ],
            "no-unused-vars": [
                2,
                {
                    "args": "none",
                    "caughtErrors": "none"
                }
            ],
            "semi": [
                "error",
                "always"
            ]
        }
    }
]);
