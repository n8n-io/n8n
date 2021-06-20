module.exports = {
    "env": {
        "es2017": true,
        "node": true
    },
    "extends": [
    //    "eslint:recommended",
    //    "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 8,
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "no-undefined": ["error"]
    }
};
