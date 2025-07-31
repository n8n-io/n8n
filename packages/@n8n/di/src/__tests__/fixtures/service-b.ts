import { Service } from '../../di';
import { ServiceA } from './service-a';

@Service()
export class ServiceB {
	constructor(readonly a: ServiceA) {}
}
