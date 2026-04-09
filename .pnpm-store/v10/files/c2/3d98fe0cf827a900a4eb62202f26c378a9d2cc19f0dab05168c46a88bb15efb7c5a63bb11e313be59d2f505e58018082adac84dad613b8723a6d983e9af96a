{
  "name": "jake",
  "description": "JavaScript build tool, similar to Make or Rake",
  "keywords": [
    "build",
    "cli",
    "make",
    "rake"
  ],
  "version": "10.9.4",
  "author": "Matthew Eernisse <mde@fleegix.org> (http://fleegix.org)",
  "license": "Apache-2.0",
  "bin": {
    "jake": "./bin/cli.js"
  },
  "main": "./lib/jake.js",
  "scripts": {
    "lint": "eslint --format codeframe \"lib/**/*.js\" \"test/**/*.js\"",
    "lint:fix": "eslint --fix \"lib/**/*.js\" \"test/**/*.js\"",
    "test": "./bin/cli.js test",
    "test:ci": "npm run lint && npm run test"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/jakejs/jake.git"
  },
  "preferGlobal": true,
  "dependencies": {
    "async": "^3.2.6",
    "filelist": "^1.0.4",
    "picocolors": "^1.1.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.16.0",
    "eslint": "^9.16.0",
    "eslint-formatter-codeframe": "^7.32.1",
    "globals": "^15.13.0",
    "mocha": "^11.0.1",
    "q": "^1.5.1"
  },
  "engines": {
    "node": ">=10"
  }
}
