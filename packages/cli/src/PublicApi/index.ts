// eslint-disable-next-line import/no-cycle
import { publicApiController as publicApiControllerV1 } from './v1';

export const publicApi = [publicApiControllerV1()];
