import { Service } from '../../di';
import { ServiceB } from './service-b';

@Service()
export class ServiceA {
	constructor(readonly b: ServiceB) {}
}
