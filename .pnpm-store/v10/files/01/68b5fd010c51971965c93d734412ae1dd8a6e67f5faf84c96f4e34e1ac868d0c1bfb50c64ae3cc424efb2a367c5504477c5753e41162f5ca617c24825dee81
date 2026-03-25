import {assert} from 'chai';
import {machineId, machineIdSync} from '../dist/index';

let {platform} = process,
    originalPattern = {
        darwin: /^[0-9,A-z]{8}-[0-9,A-z]{4}-[0-9,A-z]{4}-[0-9,A-z]{4}-[0-9,A-z]{12}$/,
        win32: /^[0-9,A-z]{8}-[0-9,A-z]{4}-[0-9,A-z]{4}-[0-9,A-z]{4}-[0-9,A-z]{12}$/,
        linux: /^[0-9,A-z]{32}$/,
        freebsd: /^[0-9,A-z]{8}-[0-9,A-z]{4}-[0-9,A-z]{4}-[0-9,A-z]{4}-[0-9,A-z]{12}$/
    },
    hashPattern = /^[0-9,A-z]{64}$/;

describe('Async call: machineId({original: true})', function() {
    it('should return original unique id', async () => {
        let id = await machineId({original: true});
        assert.match(id, originalPattern[platform]);
    });
});

describe('Sync call: machineIdSync({original: true})', function() {
    it('should return original unique id', () => {
        assert.match(machineIdSync({original: true}), originalPattern[platform]);
    });
});

describe('Async call: machineId()', function() {
    it('should return unique sha256-hash', async () => {
        let id = await machineId();
        assert.match(id, hashPattern);
    });
});

describe('Sync call: machineIdSync()', function() {
    it('should return unique sha256-hash', () => {
        assert.match(machineIdSync(), hashPattern);
    });
});

describe('CommonJS imports', function () {
    it('should return function machineIdSync, machineId', function () {
        let __module__ = require('../dist/index');
        assert.isFunction(__module__.machineId);
        assert.isFunction(__module__.machineIdSync);
    });
});
