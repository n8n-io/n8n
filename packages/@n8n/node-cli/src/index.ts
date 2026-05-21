import Build from './commands/build';
import CloudSupport from './commands/cloud-support';
import Dev from './commands/dev';
import Lint from './commands/lint';
import New from './commands/new';
import Prerelease from './commands/prerelease';
import Release from './commands/release';

export const commands = {
	new: New,
	build: Build,
	dev: Dev,
	prerelease: Prerelease,
	release: Release,
	lint: Lint,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'cloud-support': CloudSupport,
};
