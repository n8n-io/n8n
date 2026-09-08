import { cockpitApiRequest } from './GenericFunctions';
export async function submitForm(resourceName, form) {
    const body = {
        form,
    };
    return await cockpitApiRequest.call(this, 'POST', `/forms/submit/${resourceName}`, body);
}
//# sourceMappingURL=FormFunctions.js.map