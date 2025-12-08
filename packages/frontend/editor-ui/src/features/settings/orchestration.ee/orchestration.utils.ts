export function averageWorkerLoadFromLoads(loads: number[]): number {
	return loads.reduce((prev, curr) => prev + curr, 0) / loads.length;
}

export function averageWorkerLoadFromLoadsAsString(loads: number[]): string {
	return averageWorkerLoadFromLoads(loads).toFixed(2);
}

export function memAsGb(mem: number, decimalPlaces: number = 2): number {
	return Number((mem / 1024 / 1024 / 1024).toFixed(decimalPlaces));
}

export function memAsMb(mem: number, decimalPlaces: number = 2): number {
	return Number((mem / 1024 / 1024).toFixed(decimalPlaces));
}
