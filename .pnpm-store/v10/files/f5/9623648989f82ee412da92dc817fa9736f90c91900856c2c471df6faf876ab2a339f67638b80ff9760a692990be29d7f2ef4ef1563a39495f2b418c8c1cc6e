import fs from 'fs';
import { resolve } from 'path';
const packageJsonPath = resolve(process.cwd(), 'package.json');
const version = JSON.parse(fs.readFileSync(packageJsonPath).toString()).version;

export default `Fast XML Parser ${version}
----------------
$ fxparser [-ns|-a|-c|-v|-V] <filename> [-o outputfile.json]
$ cat xmlfile.xml | fxparser [-ns|-a|-c|-v|-V] [-o outputfile.json]

Options
----------------
-ns: remove namespace from tag and atrribute name.
-a: don't parse attributes.
-c: parse values to premitive type.
-v: validate before parsing.
-V: validate only.`