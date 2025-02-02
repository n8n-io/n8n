// eslint-disable-next-line import/no-cycle
import { ServiceB } from './ServiceB';
import { Service } from '../../di';

@Service()
export class ServiceA {
	constructor(readonly b: ServiceB) {}
}
