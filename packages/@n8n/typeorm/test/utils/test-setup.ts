import 'source-map-support/register';
import 'reflect-metadata';
import * as chai from 'chai';
// Import (not require) so chai-as-promised's global type augmentation (e.g.
// `.eventually`) loads program-wide under tsc's @types resolution.
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('sinon-chai'));
chai.use(chaiAsPromised);
