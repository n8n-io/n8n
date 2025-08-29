import Build from './commands/build';
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
};
