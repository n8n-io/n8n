'use strict';

const errcode = require('../index');
const expect = require('expect.js');

describe('errcode', () => {
    describe('string as first argument', () => {
        it('should throw an error', () => {
            expect(() => { errcode('my message'); }).to.throwError((err) => {
                expect(err).to.be.a(TypeError);
            });
        });
    });

    describe('error as first argument', () => {
        it('should accept an error and do nothing', () => {
            const myErr = new Error('my message');
            const err = errcode(myErr);

            expect(err).to.be(myErr);
            expect(err.hasOwnProperty(err.code)).to.be(false);
        });

        it('should accept an error and add a code', () => {
            const myErr = new Error('my message');
            const err = errcode(myErr, 'ESOME');

            expect(err).to.be(myErr);
            expect(err.code).to.be('ESOME');
        });

        it('should accept an error object and add code & properties', () => {
            const myErr = new Error('my message');
            const err = errcode(myErr, 'ESOME', { foo: 'bar', bar: 'foo' });

            expect(err).to.be.an(Error);
            expect(err.code).to.be('ESOME');
            expect(err.foo).to.be('bar');
            expect(err.bar).to.be('foo');
        });

        it('should create an error object without code but with properties', () => {
            const myErr = new Error('my message');
            const err = errcode(myErr, { foo: 'bar', bar: 'foo' });

            expect(err).to.be.an(Error);
            expect(err.code).to.be(undefined);
            expect(err.foo).to.be('bar');
            expect(err.bar).to.be('foo');
        });

        it('should set a non-writable field', () => {
            const myErr = new Error('my message');

            Object.defineProperty(myErr, 'code', {
                value: 'derp',
                writable: false,
            });
            const err = errcode(myErr, 'ERR_WAT');

            expect(err).to.be.an(Error);
            expect(err.stack).to.equal(myErr.stack);
            expect(err.code).to.be('ERR_WAT');
        });

        it('should add a code to frozen object', () => {
            const myErr = new Error('my message');
            const err = errcode(Object.freeze(myErr), 'ERR_WAT');

            expect(err).to.be.an(Error);
            expect(err.stack).to.equal(myErr.stack);
            expect(err.code).to.be('ERR_WAT');
        });

        it('should to set a field that throws at assignment time', () => {
            const myErr = new Error('my message');

            Object.defineProperty(myErr, 'code', {
                enumerable: true,
                set() {
                    throw new Error('Nope!');
                },
                get() {
                    return 'derp';
                },
            });
            const err = errcode(myErr, 'ERR_WAT');

            expect(err).to.be.an(Error);
            expect(err.stack).to.equal(myErr.stack);
            expect(err.code).to.be('ERR_WAT');
        });

        it('should retain error type', () => {
            const myErr = new TypeError('my message');

            Object.defineProperty(myErr, 'code', {
                value: 'derp',
                writable: false,
            });
            const err = errcode(myErr, 'ERR_WAT');

            expect(err).to.be.a(TypeError);
            expect(err.stack).to.equal(myErr.stack);
            expect(err.code).to.be('ERR_WAT');
        });

        it('should add a code to a class that extends Error', () => {
            class CustomError extends Error {
                set code(val) {
                    throw new Error('Nope!');
                }
            }

            const myErr = new CustomError('my message');

            Object.defineProperty(myErr, 'code', {
                value: 'derp',
                writable: false,
                configurable: false,
            });
            const err = errcode(myErr, 'ERR_WAT');

            expect(err).to.be.a(CustomError);
            expect(err.stack).to.equal(myErr.stack);
            expect(err.code).to.be('ERR_WAT');

            // original prototype chain should be intact
            expect(() => {
                const otherErr = new CustomError('my message');

                otherErr.code = 'derp';
            }).to.throwError();
        });

        it('should support errors that are not Errors', () => {
            const err = errcode({
                message: 'Oh noes!',
            }, 'ERR_WAT');

            expect(err.message).to.be('Oh noes!');
            expect(err.code).to.be('ERR_WAT');
        });
    });

    describe('falsy first arguments', () => {
        it('should not allow passing null as the first argument', () => {
            expect(() => { errcode(null); }).to.throwError((err) => {
                expect(err).to.be.a(TypeError);
            });
        });

        it('should not allow passing undefined as the first argument', () => {
            expect(() => { errcode(undefined); }).to.throwError((err) => {
                expect(err).to.be.a(TypeError);
            });
        });
    });
});
