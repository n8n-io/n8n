import * as semver from 'semver';
import * as path from 'path';
import * as process from 'process';
import { yellow } from 'colorette';

try {
  const { engines } = require(path.join(__dirname, '../package.json'));
  const version = engines.node;

  if (!semver.satisfies(process.version, version)) {
    process.stderr.write(
      yellow(
        `\n⚠️ Warning: failed to satisfy expected node version. Expected: "${version}", Current "${process.version}"\n\n`
      )
    );
  }
} catch (e) {
  // Do nothing
}
