declare var __DEV__: boolean
declare var __TSDX_FORMAT__: 'esm' | 'cjs' | 'umd';

declare namespace NodeJS
{
	interface ProcessEnv
	{
		TSDX_FORMAT?: typeof __TSDX_FORMAT__
		NODE_ENV?: string | 'test' | 'development' | 'production'
	}
}
