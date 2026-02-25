// eslint-disable-next-line import-x/no-cycle
import { ServiceB } from './service-b';
import { Service } from '../../di';

@Service()
export class ServiceA {
	constructor(readonly b: ServiceB) {}
}
