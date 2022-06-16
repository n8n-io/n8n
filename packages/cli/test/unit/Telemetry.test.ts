import Telemetry from '../../src/telemetry';

describe('Telemetry', () => {
    jest.spyOn(Telemetry.prototype as any, 'createTelemetryClient').mockImplementation(() => {
        return {
            flush: () => {},
            identify: () => {},
            track: () => {},
        };
    });

    jest.spyOn(Telemetry.prototype as any, 'startPulse').mockImplementation(() => {});

    const spyTrack = jest.spyOn(Telemetry.prototype, 'track');

	const telemetry = new Telemetry('Telemetry unit test', '0.0.0');

	describe('trackN8nStop', () => {
		test('should call track method', () => {
			telemetry.trackN8nStop();
            expect(spyTrack).toHaveBeenCalledTimes(1);
		});
	});
});
