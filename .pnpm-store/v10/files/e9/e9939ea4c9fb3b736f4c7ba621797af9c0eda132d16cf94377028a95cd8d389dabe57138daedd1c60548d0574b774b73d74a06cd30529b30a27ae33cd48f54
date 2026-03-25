import { ServiceDefinition } from './make-client';
import { Server, UntypedServiceImplementation } from './server';
interface GetServiceDefinition {
    (): ServiceDefinition;
}
interface GetHandlers {
    (): UntypedServiceImplementation;
}
export declare function registerAdminService(getServiceDefinition: GetServiceDefinition, getHandlers: GetHandlers): void;
export declare function addAdminServicesToServer(server: Server): void;
export {};
