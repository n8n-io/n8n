import { Config, Env } from '../decorators';

@Config
export class ProfilingConfig {
	/**
	 * URL of a Pyroscope server that receives heap and CPU profiles from this process.
	 * Profiling is off when empty. Intended for local memory debugging, not production.
	 */
	@Env('N8N_PROFILING_PYROSCOPE_URL')
	pyroscopeUrl: string = '';
}
