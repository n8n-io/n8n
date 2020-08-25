import {
	INodeProperties,
} from 'n8n-workflow';
export const jobsOperations = [
    {
        default: 'getJob',
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        description:'Choose an operation',
        required: true,
        displayOptions: {
            show: {
                resource: ['job']
            }
        },
        options: [
            { name: 'Get Job', value: 'getJob', description: 'Get job details' },
            { name: 'Get Report', value: 'getReport', description: 'Get job report' },
        ]
    },
	
] as INodeProperties[];
export const jobFields:INodeProperties[] =[
    {
        displayName:'Job Id',
        name:'jobId',
        type:'string',
        required:true,
        displayOptions:{
            show:{
                resource:['job'],operation:['getJob','getReport']
            },
        },
        default:'',
    }
];
