import { evaluateNatively } from '..';
import type { NativeEvaluationData, NativeEvaluationHost } from '..';

class HostExpressionError extends Error {}

const dataOf = (json: Record<string, unknown>): NativeEvaluationData => ({
	$json: json,
	$node: {},
	$: () => undefined,
});

const hostOf = (overrides: Partial<NativeEvaluationHost> = {}): NativeEvaluationHost => ({
	extend: () => undefined,
	isExpressionError: (error) => error instanceof HostExpressionError,
	...overrides,
});

describe('native evaluation host', () => {
	it('calls the extension dispatch of the host', () => {
		const extend = vi.fn().mockReturnValue('from host');

		const result = evaluateNatively(
			'{{ $json.name.isEmpty() }}',
			dataOf({ name: 'a' }),
			hostOf({ extend }),
		);

		expect(extend).toHaveBeenCalledWith('a', 'isEmpty', []);
		expect(result).toEqual({ handled: true, value: 'from host' });
	});

	it('rethrows an error that the host names an expression error', () => {
		const error = new HostExpressionError('from host');
		const extend = () => {
			throw error;
		};

		expect(() =>
			evaluateNatively('{{ $json.name.isEmpty() }}', dataOf({ name: 'a' }), hostOf({ extend })),
		).toThrow(error);
	});

	it('yields undefined for an error that the host does not name an expression error', () => {
		const extend = () => {
			throw new TypeError('not an expression error');
		};

		const result = evaluateNatively(
			'{{ $json.name.isEmpty() }}',
			dataOf({ name: 'a' }),
			hostOf({ extend }),
		);

		expect(result).toEqual({ handled: true, value: undefined });
	});
});
