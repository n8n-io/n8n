import { installPackage } from '@antfu/install-pkg';
import { sleep } from '@antfu/utils';
import { cyan } from 'kolorist';
import { warnOnce } from './warn.mjs';

let pending;
const tasks = {};
async function tryInstallPkg(name, autoInstall) {
  if (pending) {
    await pending;
  }
  if (!tasks[name]) {
    console.log(cyan(`Installing ${name}...`));
    if (typeof autoInstall === "function") {
      tasks[name] = pending = autoInstall(name).then(() => sleep(300)).finally(() => {
        pending = void 0;
      });
    } else {
      tasks[name] = pending = installPackage(name, {
        dev: true,
        preferOffline: true
      }).then(() => sleep(300)).catch((e) => {
        warnOnce(`Failed to install ${name}`);
        console.error(e);
      }).finally(() => {
        pending = void 0;
      });
    }
  }
  return tasks[name];
}

export { tryInstallPkg };
