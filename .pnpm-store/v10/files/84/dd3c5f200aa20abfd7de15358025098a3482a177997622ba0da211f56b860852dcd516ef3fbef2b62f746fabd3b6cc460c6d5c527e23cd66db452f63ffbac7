# Troubleshooting

## Running ts-jest on CI tools

### PROBLEM

Cannot find module "" from ""

### SOLUTION

- Check if `rootDir` is referenced correctly. If not add this on your existing jest configuration.

```javascript
module.exports = {
  ...
   roots: ["<rootDir>"]
}
```

- Check if module directories are included on your jest configuration. If not add this on your existing jest configuration.

```javascript
module.exports = {
  ...
  moduleDirectories: ["node_modules","<module-directory>"],
  modulePaths: ["<path-of-module>"],
}
```

- Check if module name is properly mapped and can be referenced by jest. If not, you can define moduleNameMapper for your jest configuration.

```javascript
module.exports = {
  ...
  moduleNameMapper: {
    "<import-path>": "<rootDir>/<real-physical-path>",
  },
}
```

- Check github folder names if its identical to you local folder names. Sometimes github never updates your folder names even if you rename it locally. If this happens rename your folders via github or use this command `git mv <source> <destination>` and commit changes.

## Transform (node)-module explicitly

### PROBLEM

SyntaxError: Cannot use import statement outside a module

### SOLUTION

One of the node modules hasn't the correct syntax for Jests execution step. It needs to
be transformed first.

There is a good chance that the error message shows which module is affected:

```shell
    SyntaxError: Cannot use import statement outside a module
    > 22 | import Component from "../../node_modules/some-module/lib";
         | ^
```

In this case **some-module** is the problem and needs to be transformed.
By adding the following line to the configuration file it will tell Jest which modules
shouldnt be ignored during the transformation step:

```javascript
module.exports = {
  ...
  transformIgnorePatterns: ["node_modules/(?!(some-module|another-module))"]
};
```

**some-module** and **another-module** will be transformed.

For more information see [here](https://stackoverflow.com/questions/63389757/jest-unit-test-syntaxerror-cannot-use-import-statement-outside-a-module) and [here](https://stackoverflow.com/questions/52035066/how-to-write-jest-transformignorepatterns).
