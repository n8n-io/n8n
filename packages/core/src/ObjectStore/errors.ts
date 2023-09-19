// import { jsonStringify } from 'n8n-workflow';
import type { AxiosRequestConfig } from 'axios';

export namespace ObjectStorageError {
	export class TypeMismatch extends TypeError {
		constructor(expectedType: 'stream' | 'buffer', actualType: string) {
			super(`Expected ${expectedType} but received ${actualType} from external storage download.`);
		}
	}

	export class RequestFailed extends Error {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		constructor(requestConfig: AxiosRequestConfig) {
			const msg = 'Request to external object storage failed';
			// const config = jsonStringify(requestConfig);

			// super([msg, config].join(': '));
			super([msg].join(': '));
		}
	}
}
