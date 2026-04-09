import ESM_COMPAT_Module1 from 'node:module';
import 'node:url';
import 'node:path';
import { __require } from './chunk-OWLSIX54.js';
import { versions } from '@storybook/core/common';
import { spawn } from 'child_process';

ESM_COMPAT_Module1.createRequire(import.meta.url);
var args=process.argv.slice(2);if(["dev","build"].includes(args[0]))__require("@storybook/core/cli/bin");else {let command=["npx","--yes",...args[0]==="init"?[`create-storybook@${versions.storybook}`,...args.slice(1)]:[`@storybook/cli@${versions.storybook}`,...args]];spawn(command[0],command.slice(1),{stdio:"inherit",shell:!0}).on("exit",code=>{code!=null&&process.exit(code),process.exit(1);});}
