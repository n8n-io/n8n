import { capitalCase } from 'change-case';
import moment from 'moment-timezone';
import { apiRequest } from '../../../transport';
export async function create(index) {
    const body = {};
    const requestMethod = 'POST';
    const endpoint = 'employees';
    //body parameters
    body.firstName = this.getNodeParameter('firstName', index);
    body.lastName = this.getNodeParameter('lastName', index);
    const additionalFields = this.getNodeParameter('additionalFields', index);
    const synced = this.getNodeParameter('synced', index);
    if (synced) {
        Object.assign(body, {
            address: this.getNodeParameter('address.value', index, {}),
        });
        Object.assign(body, {
            payRate: this.getNodeParameter('payRate.value', index, {}),
        });
        body.department = this.getNodeParameter('department', index);
        body.dateOfBirth = this.getNodeParameter('dateOfBirth', index);
        body.division = this.getNodeParameter('division', index);
        body.employeeNumber = this.getNodeParameter('employeeNumber', index);
        body.exempt = this.getNodeParameter('exempt', index);
        body.gender = this.getNodeParameter('gender', index);
        body.hireDate = this.getNodeParameter('hireDate', index);
        body.location = this.getNodeParameter('location', index);
        body.maritalStatus = this.getNodeParameter('maritalStatus', index);
        body.mobilePhone = this.getNodeParameter('mobilePhone', index);
        body.paidPer = this.getNodeParameter('paidPer', index);
        body.payType = this.getNodeParameter('payType', index);
        body.preferredName = this.getNodeParameter('preferredName', index);
        body.ssn = this.getNodeParameter('ssn', index);
    }
    else {
        Object.assign(body, {
            address: this.getNodeParameter('additionalFields.address.value', index, {}),
        });
        Object.assign(body, {
            payRate: this.getNodeParameter('additionalFields.payRate.value', index, {}),
        });
        delete additionalFields.address;
        delete additionalFields.payRate;
    }
    Object.assign(body, additionalFields);
    if (body.gender) {
        body.gender = capitalCase(body.gender);
    }
    if (body.dateOfBirth) {
        body.dateOfBirth = moment(body.dateOfBirth).format('YYYY-MM-DD');
    }
    if (body.exempt) {
        body.exempt = capitalCase(body.exempt);
    }
    if (body.hireDate) {
        body.hireDate = moment(body.hireDate).format('YYYY-MM-DD');
    }
    if (body.maritalStatus) {
        body.maritalStatus = capitalCase(body.maritalStatus);
    }
    if (body.payType) {
        body.payType = capitalCase(body.payType);
    }
    if (body.paidPer) {
        body.paidPer = capitalCase(body.paidPer);
    }
    if (!Object.keys(body.payRate).length) {
        delete body.payRate;
    }
    //response
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, {}, { resolveWithFullResponse: true });
    //obtain employeeID
    const rawEmployeeId = responseData.headers.location.lastIndexOf('/');
    const employeeId = responseData.headers.location.substring(rawEmployeeId + 1);
    //return
    return this.helpers.returnJsonArray({ id: employeeId });
}
//# sourceMappingURL=execute.js.map