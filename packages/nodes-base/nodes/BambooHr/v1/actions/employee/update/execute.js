import { capitalCase } from 'change-case';
import moment from 'moment-timezone';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest } from '../../../transport';
export async function update(index) {
    let body = {};
    const requestMethod = 'POST';
    //meta data
    const id = this.getNodeParameter('employeeId', index);
    //endpoint
    const endpoint = `employees/${id}`;
    //body parameters
    body = this.getNodeParameter('updateFields', index);
    const updateFields = this.getNodeParameter('updateFields', index);
    const synced = this.getNodeParameter('synced', index);
    if (synced) {
        Object.assign(body, {
            address: this.getNodeParameter('address.value', index, {}),
        });
        Object.assign(body, {
            payRate: this.getNodeParameter('payRate.value', index, {}),
        });
        body.firstName = this.getNodeParameter('firstName', index);
        body.lastName = this.getNodeParameter('lastName', index);
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
        if (!Object.keys(updateFields).length) {
            throw new NodeOperationError(this.getNode(), 'At least one fields must be updated');
        }
        Object.assign(body, {
            address: this.getNodeParameter('updateFields.address.value', index, {}),
        });
        Object.assign(body, {
            payRate: this.getNodeParameter('updateFields.payRate.value', index, {}),
        });
        delete updateFields.address;
        delete updateFields.payRate;
    }
    Object.assign(body, updateFields);
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
    await apiRequest.call(this, requestMethod, endpoint, body);
    //return
    return this.helpers.returnJsonArray({ success: true });
}
//# sourceMappingURL=execute.js.map