import 'source-map-support/register';
import 'reflect-metadata';
import { resolve } from 'path';
import appRootPath from 'app-root-path';
import * as chai from 'chai';
// Import (not require) so chai-as-promised's global type augmentation (e.g.
// `.eventually`) loads program-wide under tsc's @types resolution.
import chaiAsPromised from 'chai-as-promised';

// Pin app-root-path to this package's root. The suite (and FileLogger) assume
// the app root is the package directory, but in a monorepo app-root-path
// resolves to the repo root. Strip the build/compiled segment so this works
// whether running from source or compiled output.
appRootPath.setPath(resolve(__dirname.replace(/[\\/]build[\\/]compiled[\\/]/, '/'), '../..'));

chai.should();
chai.use(require('sinon-chai'));
chai.use(chaiAsPromised);
