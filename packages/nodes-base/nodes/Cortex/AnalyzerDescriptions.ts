import {
	INodeProperties,
} from 'n8n-workflow';
import {
    TLP
}from './AnalyzerInterface'
export const analyzersOperations = [
    {
        default: 'execute',
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        required: true,
        description:'Choose an operation',
        displayOptions: {
            show: {
                resource: ['analyzer']
            }
        },
        options: [
            { name: 'Execute', value: 'execute', description: 'Execute Analyzer' },
        ]
    },
	
] as INodeProperties[];
export const analyzerFields:INodeProperties[] =[
    {
		default: '',
        description: 'choose the analyzer',
        displayName: 'Analyzer type',
        name: 'analyzer',
        type: 'options',
        required: true,
        typeOptions:{
            loadOptionsMethod:'loadActiveAnalyzers'
        },
        displayOptions:{
            show:{resource:['analyzer'],operation:['execute']}
        }
    },
    {
		default: '',
        description: 'choose the observable type',
        displayName: 'Observable type',
        name: 'observableType',
        type: 'options',
        required: true,
        displayOptions:{
            show:{resource:['analyzer'],operation:['execute']},
            hide:{
                analyzer:['']
            }
        },
        typeOptions:{
            loadOptionsMethod:'loadObservableOptions',
            loadOptionsDependsOn:['analyzer']

        },
    },
    
    // Observable type != file
    {
		default: '',
        description: 'enter the observable value',
        displayName: 'Observable value',
        name: 'observableValue',
        type: 'string',
        required: true,
        displayOptions:{
            show:{resource:['analyzer'],operation:['execute']},
            hide:{
                observableType:['file'],
                analyzer:['']
            }
        }
        
    },
    // Observable type == file
    {
        name: 'fileType',
        default: 'path',
        displayName: 'File Type',
        type: 'options',
        required: false,
        options: [{ name: 'Path', value: 'path' }, { name: 'Binary', value: 'binary' }],
        displayOptions: { show: { observableType: ['file'],resource:['analyzer'],operation:['execute'] } },

    },
    {
        name: 'path',
        default: '',
        displayName: 'Observable file path',
        type: 'string',
        required: false,
        displayOptions: { show: { fileType:['path'],observableType: ['file'],resource:['analyzer'],operation:['execute'] } },
        description: 'observable’s file path',

    },
    {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: '',
        description: 'Attachment’s file name',
        displayOptions: { show: { fileType:['binary'],observableType: ['file'],resource:['analyzer'],operation:['execute'] } }
    },
    {
        displayName: 'Mime Type',
        name: 'mimeType',
        type: 'string',
        default: '',
        description: 'Attachment’s mime type',
        displayOptions: { show: { fileType:['binary'],observableType: ['file'],resource:['analyzer'],operation:['execute'] } }
    },
    {
        displayName: 'Data',
        name: 'data',
        type: 'string',
        default: '',
        placeholder: 'ZXhhbXBsZSBmaWxl...',
        description: 'Base64-encoded stream of data.',
        displayOptions: { show: { fileType:['binary'],observableType: ['file'],resource:['analyzer'],operation:['execute'] } }
    },
    {
        default: 2,
        description: 'choose tlp level',
        displayName: 'Tlp',
        name: 'tlp',
        type: 'options',
        required: false,
        displayOptions:{
            show:{
                resource:['analyzer'],operation:['execute']
            },
            hide:{
                observableType:[''],
                analyzer:['']
            }
        },
        options: [
            {
                name:'White',
                value:TLP.white
            },
            {
                name:'Green',
                value:TLP.green
            },
            {
                name:'Amber',
                value:TLP.amber
            },{
                name:'Red',
                value:TLP.red
            }

        ]
    },
    {
		default: true,
        description: 'use cache',
        displayName: 'Cache',
        name: 'cache',
        type: 'boolean',
        required: false,
        displayOptions:{
            show:{
                resource:['analyzer'],operation:['execute']
            },
            hide:{
                observableType:[''],
                analyzer:['']
            }
        }
        
    },
    {
        default: 3,
        description: 'specify timeout in seconds',
        displayName: 'Timout (seconds)',
        name: 'timeout',
        type: 'number',
        required: false,
        displayOptions:{
            show:{
                resource:['analyzer'],operation:['execute']
            },
            hide:{
                observableType:[''],
                analyzer:['']
            }
        }
    },
];
