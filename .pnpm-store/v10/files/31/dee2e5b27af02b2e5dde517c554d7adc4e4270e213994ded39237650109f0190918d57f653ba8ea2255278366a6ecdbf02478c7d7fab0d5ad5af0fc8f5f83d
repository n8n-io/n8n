'use strict';

//Load dependencies
const Promise = require('bluebird');
const chai = require('chai');
const dirtyChai = require('dirty-chai');
const chaiAsPromised = require('chai-as-promised');

//Enable should assertion style for usage with chai-as-promised
chai.should();

//Extend chai
chai.use(dirtyChai);
chai.use(chaiAsPromised);

//Expose globals
global.Promise = Promise;
global.expect = chai.expect;
