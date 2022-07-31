import config from '../../../../config';

export const PUBLIC_API_REST_PATH_SEGMENT = config.getEnv('publicApi.path') as Readonly<string>;
