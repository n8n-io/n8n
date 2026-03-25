"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const spinner_1 = require("../utils/spinner");
const process = require("process");
jest.useFakeTimers();
describe('Spinner', () => {
    const IS_TTY = process.stdout.isTTY;
    let writeMock;
    let spinner;
    beforeEach(() => {
        process.stdout.isTTY = true;
        writeMock = jest.spyOn(process.stdout, 'write').mockImplementation(jest.fn());
        spinner = new spinner_1.Spinner();
    });
    afterEach(() => {
        writeMock.mockRestore();
        jest.clearAllTimers();
    });
    afterAll(() => {
        process.stdout.isTTY = IS_TTY;
    });
    it('starts the spinner', () => {
        spinner.start('Loading');
        jest.advanceTimersByTime(100);
        expect(writeMock).toHaveBeenCalledWith('\r⠋ Loading');
    });
    it('stops the spinner', () => {
        spinner.start('Loading');
        spinner.stop();
        expect(writeMock).toHaveBeenCalledWith('\r');
    });
    it('should write 3 frames', () => {
        spinner.start('Loading');
        jest.advanceTimersByTime(300);
        expect(writeMock).toHaveBeenCalledTimes(3);
    });
    it('should call write 1 times if CI set to true', () => {
        process.stdout.isTTY = false;
        spinner.start('Loading');
        jest.advanceTimersByTime(300);
        expect(writeMock).toHaveBeenCalledTimes(1);
    });
});
