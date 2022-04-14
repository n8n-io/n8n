/* eslint-disable import/no-cycle */
import { publicApiControllerV1 } from './v1';
import { publicApiControllerV2 } from './v2';

export const publicApi = [publicApiControllerV1, publicApiControllerV2];
