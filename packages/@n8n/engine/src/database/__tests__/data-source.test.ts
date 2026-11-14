import { describe, expect, it } from 'vitest';

import { createDataSource } from '../data-source';

const url = 'postgres://engine:secret@localhost:5432/engine';

const poolOptions = (dataSource: ReturnType<typeof createDataSource>) => {
	const { poolSize, connectTimeoutMS } = dataSource.options as {
		poolSize?: number;
		connectTimeoutMS?: number;
	};
	return { poolSize, connectTimeoutMS };
};

describe('createDataSource', () => {
	it('sets the pool size and the connection timeout on the options', () => {
		const dataSource = createDataSource(url, { poolSize: 25, connectTimeoutMS: 5000 });

		expect(poolOptions(dataSource)).toEqual({ poolSize: 25, connectTimeoutMS: 5000 });
	});

	it('leaves the pool size and the connection timeout unset when none is given', () => {
		const dataSource = createDataSource(url);

		expect(poolOptions(dataSource)).toEqual({ poolSize: undefined, connectTimeoutMS: undefined });
	});
});
