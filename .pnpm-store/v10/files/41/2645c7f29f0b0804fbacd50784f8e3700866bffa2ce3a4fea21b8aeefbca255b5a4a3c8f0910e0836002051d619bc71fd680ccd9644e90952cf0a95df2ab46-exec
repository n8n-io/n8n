{
  "name": "aws-ssl-profiles",
  "version": "1.1.2",
  "main": "lib/index.js",
  "author": "https://github.com/wellwelwel",
  "description": "AWS RDS SSL certificates bundles.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/mysqljs/aws-ssl-profiles"
  },
  "bugs": {
    "url": "https://github.com/mysqljs/aws-ssl-profiles/issues"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.8.3",
    "@types/node": "^22.5.1",
    "@types/x509.js": "^1.0.3",
    "poku": "^2.5.0",
    "prettier": "^3.3.3",
    "tsx": "^4.19.0",
    "typescript": "^5.5.4",
    "x509.js": "^1.0.0"
  },
  "files": [
    "lib"
  ],
  "engines": {
    "node": ">= 6.0.0"
  },
  "keywords": [
    "mysql",
    "mysql2",
    "pg",
    "postgres",
    "aws",
    "rds",
    "ssl",
    "certificates",
    "ca",
    "bundle"
  ],
  "scripts": {
    "build": "npx tsc",
    "postbuild": "cp src/index.d.ts lib/index.d.ts",
    "lint": "npx @biomejs/biome lint && prettier --check .",
    "lint:fix": "npx @biomejs/biome lint --write . && prettier --write .",
    "pretest": "npm run build",
    "test": "poku --parallel ./test",
    "test:ci": "npm run lint && npm run test"
  }
}
