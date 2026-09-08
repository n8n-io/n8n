import { writeFile as fsWriteFile } from 'fs/promises';
import getSystemFonts from 'get-system-fonts';
import gm from 'gm';
import { NodeOperationError, NodeConnectionTypes, deepCopy } from 'n8n-workflow';
import { parse as pathParse } from 'path';
import { file } from 'tmp-promise';
const GRAVITY_MAP = {
    west: { north: 'northwest', middle: 'west', south: 'southwest' },
    center: { north: 'north', middle: 'center', south: 'south' },
    east: { north: 'northeast', middle: 'east', south: 'southeast' },
};
export function resolveGravity(horizontal, vertical) {
    return GRAVITY_MAP[horizontal]?.[vertical] ?? 'northwest';
}
const numericOperationParameters = {
    blur: ['blur', 'sigma'],
    border: ['borderWidth', 'borderHeight'],
    composite: ['positionX', 'positionY'],
    create: ['width', 'height'],
    crop: ['width', 'height', 'positionX', 'positionY'],
    draw: ['startPositionX', 'startPositionY', 'endPositionX', 'endPositionY', 'cornerRadius'],
    resize: ['width', 'height'],
    rotate: ['rotate'],
    shear: ['degreesX', 'degreesY'],
    text: ['fontSize', 'positionX', 'positionY', 'lineLength'],
};
function parseNumericParameter(value, parameterName, node) {
    if ((typeof value !== 'number' && typeof value !== 'string') ||
        (typeof value === 'string' && value.trim() === '')) {
        throw new NodeOperationError(node, `The value of "${parameterName}" must be a number`);
    }
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
        throw new NodeOperationError(node, `The value of "${parameterName}" must be a number`);
    }
    return parsedValue;
}
const VALID_IMAGE_FORMATS = new Set(['bmp', 'gif', 'jpeg', 'png', 'tiff', 'tif', 'webp']);
function validateImageFormat(format, node) {
    if (typeof format === 'string' && VALID_IMAGE_FORMATS.has(format)) {
        return format;
    }
    throw new NodeOperationError(node, `Invalid image format: ${format}. Valid formats are: ${Array.from(VALID_IMAGE_FORMATS).join(', ')}`);
}
const nodeOperations = [
    {
        name: 'Blur',
        value: 'blur',
        description: 'Adds a blur to the image and so makes it less sharp',
        action: 'Blur Image',
    },
    {
        name: 'Border',
        value: 'border',
        description: 'Adds a border to the image',
        action: 'Border Image',
    },
    {
        name: 'Composite',
        value: 'composite',
        description: 'Composite image on top of another one',
        action: 'Composite Image',
    },
    {
        name: 'Create',
        value: 'create',
        description: 'Create a new image',
        action: 'Create Image',
    },
    {
        name: 'Crop',
        value: 'crop',
        description: 'Crops the image',
        action: 'Crop Image',
    },
    {
        name: 'Draw',
        value: 'draw',
        description: 'Draw on image',
        action: 'Draw Image',
    },
    {
        name: 'Rotate',
        value: 'rotate',
        description: 'Rotate image',
        action: 'Rotate Image',
    },
    {
        name: 'Resize',
        value: 'resize',
        description: 'Change the size of image',
        action: 'Resize Image',
    },
    {
        name: 'Shear',
        value: 'shear',
        description: 'Shear image along the X or Y axis',
        action: 'Shear Image',
    },
    {
        name: 'Text',
        value: 'text',
        description: 'Adds text to image',
        action: 'Apply Text to Image',
    },
    {
        name: 'Transparent',
        value: 'transparent',
        description: 'Make a color in image transparent',
        action: 'Add Transparency to Image',
    },
];
const nodeOperationOptions = [
    // ----------------------------------
    //         create
    // ----------------------------------
    {
        displayName: 'Background Color',
        name: 'backgroundColor',
        type: 'color',
        default: '#ffffff00',
        typeOptions: {
            showAlpha: true,
        },
        displayOptions: {
            show: {
                operation: ['create'],
            },
        },
        description: 'The background color of the image to create',
    },
    {
        displayName: 'Image Width',
        name: 'width',
        type: 'number',
        default: 50,
        typeOptions: {
            minValue: 1,
        },
        displayOptions: {
            show: {
                operation: ['create'],
            },
        },
        description: 'The width of the image to create',
    },
    {
        displayName: 'Image Height',
        name: 'height',
        type: 'number',
        default: 50,
        typeOptions: {
            minValue: 1,
        },
        displayOptions: {
            show: {
                operation: ['create'],
            },
        },
        description: 'The height of the image to create',
    },
    // ----------------------------------
    //         draw
    // ----------------------------------
    {
        displayName: 'Primitive',
        name: 'primitive',
        type: 'options',
        displayOptions: {
            show: {
                operation: ['draw'],
            },
        },
        options: [
            {
                name: 'Circle',
                value: 'circle',
            },
            {
                name: 'Line',
                value: 'line',
            },
            {
                name: 'Rectangle',
                value: 'rectangle',
            },
        ],
        default: 'rectangle',
        description: 'The primitive to draw',
    },
    {
        displayName: 'Color',
        name: 'color',
        type: 'color',
        default: '#ff000000',
        typeOptions: {
            showAlpha: true,
        },
        displayOptions: {
            show: {
                operation: ['draw'],
            },
        },
        description: 'The color of the primitive to draw',
    },
    {
        displayName: 'Start Position X',
        name: 'startPositionX',
        type: 'number',
        default: 50,
        displayOptions: {
            show: {
                operation: ['draw'],
                primitive: ['circle', 'line', 'rectangle'],
            },
        },
        description: 'X (horizontal) start position of the primitive',
    },
    {
        displayName: 'Start Position Y',
        name: 'startPositionY',
        type: 'number',
        default: 50,
        displayOptions: {
            show: {
                operation: ['draw'],
                primitive: ['circle', 'line', 'rectangle'],
            },
        },
        description: 'Y (horizontal) start position of the primitive',
    },
    {
        displayName: 'End Position X',
        name: 'endPositionX',
        type: 'number',
        default: 250,
        displayOptions: {
            show: {
                operation: ['draw'],
                primitive: ['circle', 'line', 'rectangle'],
            },
        },
        description: 'X (horizontal) end position of the primitive',
    },
    {
        displayName: 'End Position Y',
        name: 'endPositionY',
        type: 'number',
        default: 250,
        displayOptions: {
            show: {
                operation: ['draw'],
                primitive: ['circle', 'line', 'rectangle'],
            },
        },
        description: 'Y (horizontal) end position of the primitive',
    },
    {
        displayName: 'Corner Radius',
        name: 'cornerRadius',
        type: 'number',
        default: 0,
        displayOptions: {
            show: {
                operation: ['draw'],
                primitive: ['rectangle'],
            },
        },
        description: 'The radius of the corner to create round corners',
    },
    // ----------------------------------
    //         text
    // ----------------------------------
    {
        displayName: 'Text',
        name: 'text',
        typeOptions: {
            rows: 5,
        },
        type: 'string',
        default: '',
        placeholder: 'Text to render',
        displayOptions: {
            show: {
                operation: ['text'],
            },
        },
        description: 'Text to write on the image',
    },
    {
        displayName: 'Font Size',
        name: 'fontSize',
        type: 'number',
        default: 18,
        displayOptions: {
            show: {
                operation: ['text'],
            },
        },
        description: 'Size of the text',
    },
    {
        displayName: 'Font Color',
        name: 'fontColor',
        type: 'color',
        default: '#000000',
        displayOptions: {
            show: {
                operation: ['text'],
            },
        },
        description: 'Color of the text',
    },
    {
        displayName: 'Position X',
        name: 'positionX',
        type: 'number',
        default: 50,
        displayOptions: {
            show: {
                operation: ['text'],
            },
        },
        description: 'X (horizontal) position of the text',
    },
    {
        displayName: 'Position Y',
        name: 'positionY',
        type: 'number',
        default: 50,
        displayOptions: {
            show: {
                operation: ['text'],
            },
        },
        description: 'Y (vertical) position of the text',
    },
    {
        displayName: 'Horizontal Alignment',
        name: 'horizontalAlignment',
        type: 'options',
        options: [
            {
                name: 'Left',
                value: 'west',
            },
            {
                name: 'Center',
                value: 'center',
            },
            {
                name: 'Right',
                value: 'east',
            },
        ],
        default: 'center',
        displayOptions: {
            show: {
                operation: ['text'],
                '@version': [{ _cnd: { gte: 1.1 } }],
            },
        },
        description: 'Horizontal alignment of the text',
    },
    {
        displayName: 'Vertical Alignment',
        name: 'verticalAlignment',
        type: 'options',
        options: [
            {
                name: 'Top',
                value: 'north',
            },
            {
                name: 'Middle',
                value: 'middle',
            },
            {
                name: 'Bottom',
                value: 'south',
            },
        ],
        default: 'middle',
        displayOptions: {
            show: {
                operation: ['text'],
                '@version': [{ _cnd: { gte: 1.1 } }],
            },
        },
        description: 'Vertical alignment of the text',
    },
    {
        displayName: 'Max Line Length',
        name: 'lineLength',
        type: 'number',
        typeOptions: {
            minValue: 1,
        },
        default: 80,
        displayOptions: {
            show: {
                operation: ['text'],
            },
        },
        description: 'Max amount of characters in a line before a line-break should get added',
    },
    // ----------------------------------
    //         blur
    // ----------------------------------
    {
        displayName: 'Blur',
        name: 'blur',
        type: 'number',
        typeOptions: {
            minValue: 0,
            maxValue: 1000,
        },
        default: 5,
        displayOptions: {
            show: {
                operation: ['blur'],
            },
        },
        description: 'How strong the blur should be',
    },
    {
        displayName: 'Sigma',
        name: 'sigma',
        type: 'number',
        typeOptions: {
            minValue: 0,
            maxValue: 1000,
        },
        default: 2,
        displayOptions: {
            show: {
                operation: ['blur'],
            },
        },
        description: 'The sigma of the blur',
    },
    // ----------------------------------
    //         border
    // ----------------------------------
    {
        displayName: 'Border Width',
        name: 'borderWidth',
        type: 'number',
        default: 10,
        displayOptions: {
            show: {
                operation: ['border'],
            },
        },
        description: 'The width of the border',
    },
    {
        displayName: 'Border Height',
        name: 'borderHeight',
        type: 'number',
        default: 10,
        displayOptions: {
            show: {
                operation: ['border'],
            },
        },
        description: 'The height of the border',
    },
    {
        displayName: 'Border Color',
        name: 'borderColor',
        type: 'color',
        default: '#000000',
        displayOptions: {
            show: {
                operation: ['border'],
            },
        },
        description: 'Color of the border',
    },
    // ----------------------------------
    //         composite
    // ----------------------------------
    {
        displayName: 'Composite Image Property',
        name: 'dataPropertyNameComposite',
        type: 'string',
        default: '',
        placeholder: 'data2',
        displayOptions: {
            show: {
                operation: ['composite'],
            },
        },
        description: 'The name of the binary property which contains the data of the image to composite on top of image which is found in Property Name',
    },
    {
        displayName: 'Operator',
        name: 'operator',
        type: 'options',
        displayOptions: {
            show: {
                operation: ['composite'],
            },
        },
        options: [
            {
                name: 'Add',
                value: 'Add',
            },
            {
                name: 'Atop',
                value: 'Atop',
            },
            {
                name: 'Bumpmap',
                value: 'Bumpmap',
            },
            {
                name: 'Copy',
                value: 'Copy',
            },
            {
                name: 'Copy Black',
                value: 'CopyBlack',
            },
            {
                name: 'Copy Blue',
                value: 'CopyBlue',
            },
            {
                name: 'Copy Cyan',
                value: 'CopyCyan',
            },
            {
                name: 'Copy Green',
                value: 'CopyGreen',
            },
            {
                name: 'Copy Magenta',
                value: 'CopyMagenta',
            },
            {
                name: 'Copy Opacity',
                value: 'CopyOpacity',
            },
            {
                name: 'Copy Red',
                value: 'CopyRed',
            },
            {
                name: 'Copy Yellow',
                value: 'CopyYellow',
            },
            {
                name: 'Difference',
                value: 'Difference',
            },
            {
                name: 'Divide',
                value: 'Divide',
            },
            {
                name: 'In',
                value: 'In',
            },
            {
                name: 'Minus',
                value: 'Minus',
            },
            {
                name: 'Multiply',
                value: 'Multiply',
            },
            {
                name: 'Out',
                value: 'Out',
            },
            {
                name: 'Over',
                value: 'Over',
            },
            {
                name: 'Plus',
                value: 'Plus',
            },
            {
                name: 'Subtract',
                value: 'Subtract',
            },
            {
                name: 'Xor',
                value: 'Xor',
            },
        ],
        default: 'Over',
        description: 'The operator to use to combine the images',
    },
    {
        displayName: 'Position X',
        name: 'positionX',
        type: 'number',
        default: 0,
        displayOptions: {
            show: {
                operation: ['composite'],
            },
        },
        description: 'X (horizontal) position of composite image',
    },
    {
        displayName: 'Position Y',
        name: 'positionY',
        type: 'number',
        default: 0,
        displayOptions: {
            show: {
                operation: ['composite'],
            },
        },
        description: 'Y (vertical) position of composite image',
    },
    // ----------------------------------
    //         crop
    // ----------------------------------
    {
        displayName: 'Width',
        name: 'width',
        type: 'number',
        default: 500,
        displayOptions: {
            show: {
                operation: ['crop'],
            },
        },
        description: 'Crop width',
    },
    {
        displayName: 'Height',
        name: 'height',
        type: 'number',
        default: 500,
        displayOptions: {
            show: {
                operation: ['crop'],
            },
        },
        description: 'Crop height',
    },
    {
        displayName: 'Position X',
        name: 'positionX',
        type: 'number',
        default: 0,
        displayOptions: {
            show: {
                operation: ['crop'],
            },
        },
        description: 'X (horizontal) position to crop from',
    },
    {
        displayName: 'Position Y',
        name: 'positionY',
        type: 'number',
        default: 0,
        displayOptions: {
            show: {
                operation: ['crop'],
            },
        },
        description: 'Y (vertical) position to crop from',
    },
    // ----------------------------------
    //         resize
    // ----------------------------------
    {
        displayName: 'Width',
        name: 'width',
        type: 'number',
        default: 500,
        displayOptions: {
            show: {
                operation: ['resize'],
            },
        },
        description: 'New width of the image',
    },
    {
        displayName: 'Height',
        name: 'height',
        type: 'number',
        default: 500,
        displayOptions: {
            show: {
                operation: ['resize'],
            },
        },
        description: 'New height of the image',
    },
    {
        displayName: 'Option',
        name: 'resizeOption',
        type: 'options',
        options: [
            {
                name: 'Ignore Aspect Ratio',
                value: 'ignoreAspectRatio',
                description: 'Ignore aspect ratio and resize exactly to specified values',
            },
            {
                name: 'Maximum Area',
                value: 'maximumArea',
                description: 'Specified values are maximum area',
            },
            {
                name: 'Minimum Area',
                value: 'minimumArea',
                description: 'Specified values are minimum area',
            },
            {
                name: 'Only if Larger',
                value: 'onlyIfLarger',
                description: 'Resize only if image is larger than width or height',
            },
            {
                name: 'Only if Smaller',
                value: 'onlyIfSmaller',
                description: 'Resize only if image is smaller than width or height',
            },
            {
                name: 'Percent',
                value: 'percent',
                description: 'Width and height are specified in percents',
            },
        ],
        default: 'maximumArea',
        displayOptions: {
            show: {
                operation: ['resize'],
            },
        },
        description: 'How to resize the image',
    },
    // ----------------------------------
    //         rotate
    // ----------------------------------
    {
        displayName: 'Rotate',
        name: 'rotate',
        type: 'number',
        typeOptions: {
            minValue: -360,
            maxValue: 360,
        },
        default: 0,
        displayOptions: {
            show: {
                operation: ['rotate'],
            },
        },
        description: 'How much the image should be rotated',
    },
    {
        displayName: 'Background Color',
        name: 'backgroundColor',
        type: 'color',
        default: '#ffffffff',
        typeOptions: {
            showAlpha: true,
        },
        displayOptions: {
            show: {
                operation: ['rotate'],
            },
        },
        description: 'The color to use for the background when image gets rotated by anything which is not a multiple of 90',
    },
    // ----------------------------------
    //         shear
    // ----------------------------------
    {
        displayName: 'Degrees X',
        name: 'degreesX',
        type: 'number',
        default: 0,
        displayOptions: {
            show: {
                operation: ['shear'],
            },
        },
        description: 'X (horizontal) shear degrees',
    },
    {
        displayName: 'Degrees Y',
        name: 'degreesY',
        type: 'number',
        default: 0,
        displayOptions: {
            show: {
                operation: ['shear'],
            },
        },
        description: 'Y (vertical) shear degrees',
    },
    // ----------------------------------
    //         transparent
    // ----------------------------------
    {
        displayName: 'Color',
        name: 'color',
        type: 'color',
        default: '#ff0000',
        displayOptions: {
            show: {
                operation: ['transparent'],
            },
        },
        description: 'The color to make transparent',
    },
];
export class EditImage {
    description = {
        displayName: 'Edit Image',
        name: 'editImage',
        icon: 'node:edit-image',
        iconColor: 'purple',
        group: ['transform'],
        version: [1, 1.1],
        defaultVersion: 1.1,
        description: 'Edits an image like blur, resize or adding border and text',
        defaults: {
            name: 'Edit Image',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Get Information',
                        value: 'information',
                        description: 'Returns image information like resolution',
                    },
                    {
                        name: 'Multi Step',
                        value: 'multiStep',
                        description: 'Perform multiple operations',
                    },
                    ...nodeOperations,
                ].sort((a, b) => {
                    if (a.name.toLowerCase() < b.name.toLowerCase()) {
                        return -1;
                    }
                    if (a.name.toLowerCase() > b.name.toLowerCase()) {
                        return 1;
                    }
                    return 0;
                }),
                default: 'border',
            },
            {
                displayName: 'Property Name',
                name: 'dataPropertyName',
                type: 'string',
                default: 'data',
                description: 'Name of the binary property in which the image data can be found',
            },
            // ----------------------------------
            //         multiStep
            // ----------------------------------
            {
                displayName: 'Operations',
                name: 'operations',
                placeholder: 'Add Operation',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                    sortable: true,
                },
                displayOptions: {
                    show: {
                        operation: ['multiStep'],
                    },
                },
                description: 'The operations to perform',
                default: {},
                options: [
                    {
                        name: 'operations',
                        displayName: 'Operations',
                        values: [
                            {
                                displayName: 'Operation',
                                name: 'operation',
                                type: 'options',
                                noDataExpression: true,
                                options: nodeOperations,
                                default: '',
                            },
                            ...nodeOperationOptions,
                            {
                                displayName: 'Font Name or ID',
                                name: 'font',
                                type: 'options',
                                displayOptions: {
                                    show: {
                                        operation: ['text'],
                                    },
                                },
                                typeOptions: {
                                    loadOptionsMethod: 'getFonts',
                                },
                                default: '',
                                description: 'The font to use. Defaults to Arial. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                            },
                        ],
                    },
                ],
            },
            ...nodeOperationOptions,
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add option',
                default: {},
                displayOptions: {
                    hide: {
                        operation: ['information'],
                    },
                },
                options: [
                    {
                        displayName: 'Destination Output Field',
                        name: 'destinationKey',
                        type: 'string',
                        default: 'data',
                        placeholder: 'e.g image',
                        description: 'The name of the output field that will contain the file data',
                    },
                    {
                        displayName: 'File Name',
                        name: 'fileName',
                        type: 'string',
                        default: '',
                        description: 'File name to set in binary data',
                    },
                    {
                        displayName: 'Font Name or ID',
                        name: 'font',
                        type: 'options',
                        displayOptions: {
                            show: {
                                '/operation': ['text'],
                            },
                        },
                        typeOptions: {
                            loadOptionsMethod: 'getFonts',
                        },
                        default: '',
                        description: 'The font to use. Defaults to Arial. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    },
                    {
                        displayName: 'Format',
                        name: 'format',
                        type: 'options',
                        options: [
                            {
                                name: 'bmp',
                                value: 'bmp',
                            },
                            {
                                name: 'gif',
                                value: 'gif',
                            },
                            {
                                name: 'jpeg',
                                value: 'jpeg',
                            },
                            {
                                name: 'png',
                                value: 'png',
                            },
                            {
                                name: 'tiff',
                                value: 'tiff',
                            },
                            {
                                name: 'WebP',
                                value: 'webp',
                            },
                        ],
                        default: 'jpeg',
                        description: 'Set the output image format',
                    },
                    {
                        displayName: 'Quality',
                        name: 'quality',
                        type: 'number',
                        typeOptions: {
                            minValue: 0,
                            maxValue: 100,
                        },
                        default: 100,
                        displayOptions: {
                            show: {
                                format: ['jpeg', 'png', 'tiff'],
                            },
                        },
                        description: 'Sets the jpeg|png|tiff compression level from 0 to 100 (best)',
                    },
                ],
            },
        ],
    };
    methods = {
        loadOptions: {
            async getFonts() {
                const files = await getSystemFonts();
                const returnData = [];
                files.forEach((entry) => {
                    const pathParts = pathParse(entry);
                    if (!pathParts.ext) {
                        return;
                    }
                    returnData.push({
                        name: pathParts.name,
                        value: entry,
                    });
                });
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let item;
        for (let itemIndex = 0; itemIndex < length; itemIndex++) {
            try {
                item = items[itemIndex];
                const node = this.getNode();
                const operation = this.getNodeParameter('operation', itemIndex);
                const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);
                const options = this.getNodeParameter('options', itemIndex, {});
                let binaryPropertyName = options.destinationKey;
                if (!binaryPropertyName) {
                    binaryPropertyName = typeof dataPropertyName === 'string' ? dataPropertyName : 'data';
                }
                const cleanupFunctions = [];
                let gmInstance;
                const requiredOperationParameters = {
                    blur: ['blur', 'sigma'],
                    border: ['borderColor', 'borderWidth', 'borderHeight'],
                    create: ['backgroundColor', 'height', 'width'],
                    crop: ['height', 'positionX', 'positionY', 'width'],
                    composite: ['dataPropertyNameComposite', 'operator', 'positionX', 'positionY'],
                    draw: [
                        'color',
                        'cornerRadius',
                        'endPositionX',
                        'endPositionY',
                        'primitive',
                        'startPositionX',
                        'startPositionY',
                    ],
                    information: [],
                    resize: ['height', 'resizeOption', 'width'],
                    rotate: ['backgroundColor', 'rotate'],
                    shear: ['degreesX', 'degreesY'],
                    text: [
                        'horizontalAlignment',
                        'verticalAlignment',
                        'font',
                        'fontColor',
                        'fontSize',
                        'lineLength',
                        'positionX',
                        'positionY',
                        'text',
                    ],
                    transparent: ['color'],
                };
                let operations = [];
                if (operation === 'multiStep') {
                    // Operation parameters are already in the correct format
                    const operationsData = this.getNodeParameter('operations', itemIndex, {
                        operations: [],
                    });
                    operations = operationsData.operations;
                }
                else {
                    // Operation parameters have to first get collected
                    const operationParameters = {};
                    requiredOperationParameters[operation].forEach((parameterName) => {
                        try {
                            operationParameters[parameterName] = this.getNodeParameter(parameterName, itemIndex);
                        }
                        catch (error) { }
                    });
                    operations = [
                        {
                            operation,
                            ...operationParameters,
                        },
                    ];
                }
                for (const operationData of operations) {
                    const operationName = operationData.operation;
                    if (typeof operationName !== 'string')
                        continue;
                    for (const parameterName of numericOperationParameters[operationName] ?? []) {
                        // 'cornerRadius' is applicable only when drawing a rectangle
                        if (parameterName === 'cornerRadius' && operationData.primitive !== 'rectangle')
                            continue;
                        operationData[parameterName] = parseNumericParameter(operationData[parameterName], parameterName, node);
                    }
                }
                if (options.quality !== undefined) {
                    options.quality = parseNumericParameter(options.quality, 'quality', node);
                }
                if (operations[0].operation !== 'create') {
                    // "create" generates a new image so does not require any incoming data.
                    this.helpers.assertBinaryData(itemIndex, dataPropertyName);
                    const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, dataPropertyName);
                    gmInstance = gm(binaryDataBuffer);
                    gmInstance = gmInstance.background('transparent');
                    gmInstance = gmInstance.autoOrient();
                    gmInstance = gmInstance.out('-orient', 'TopLeft');
                }
                const newItem = {
                    json: item.json,
                    binary: {},
                    pairedItem: {
                        item: itemIndex,
                    },
                };
                if (operation === 'information') {
                    // Just return the information
                    const imageData = await new Promise((resolve, reject) => {
                        gmInstance = gmInstance.identify((error, data) => {
                            if (error) {
                                reject(error);
                                return;
                            }
                            resolve(data);
                        });
                    });
                    newItem.json = imageData;
                }
                for (let i = 0; i < operations.length; i++) {
                    const operationData = operations[i];
                    if (operationData.operation === 'blur') {
                        gmInstance = gmInstance.blur(operationData.blur, operationData.sigma);
                    }
                    else if (operationData.operation === 'border') {
                        gmInstance = gmInstance
                            .borderColor(operationData.borderColor)
                            .border(operationData.borderWidth, operationData.borderHeight);
                    }
                    else if (operationData.operation === 'composite') {
                        const positionX = operationData.positionX;
                        const positionY = operationData.positionY;
                        const operator = operationData.operator;
                        const geometryString = (positionX >= 0 ? '+' : '') + positionX + (positionY >= 0 ? '+' : '') + positionY;
                        const binaryPropertyName = operationData.dataPropertyNameComposite;
                        this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
                        const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
                        const { path, cleanup } = await file();
                        cleanupFunctions.push(cleanup);
                        await fsWriteFile(path, binaryDataBuffer);
                        gmInstance = gm(gmInstance.stream('png'))
                            .compose(operator)
                            .geometry(geometryString)
                            .composite(path);
                        if (operations.length !== i + 1) {
                            // If there are other operations after the current one create a new gm instance
                            // because else things do get messed up
                            gmInstance = gm(gmInstance.stream());
                        }
                    }
                    else if (operationData.operation === 'create') {
                        gmInstance = gm(operationData.width, operationData.height, operationData.backgroundColor);
                        if (!options.format) {
                            options.format = 'png';
                        }
                    }
                    else if (operationData.operation === 'crop') {
                        gmInstance = gmInstance.crop(operationData.width, operationData.height, operationData.positionX, operationData.positionY);
                    }
                    else if (operationData.operation === 'draw') {
                        gmInstance = gmInstance.fill(operationData.color);
                        if (operationData.primitive === 'line') {
                            gmInstance = gmInstance.drawLine(operationData.startPositionX, operationData.startPositionY, operationData.endPositionX, operationData.endPositionY);
                        }
                        else if (operationData.primitive === 'circle') {
                            gmInstance = gmInstance.drawCircle(operationData.startPositionX, operationData.startPositionY, operationData.endPositionX, operationData.endPositionY);
                        }
                        else if (operationData.primitive === 'rectangle') {
                            gmInstance = gmInstance.drawRectangle(operationData.startPositionX, operationData.startPositionY, operationData.endPositionX, operationData.endPositionY, operationData.cornerRadius || undefined);
                        }
                    }
                    else if (operationData.operation === 'resize') {
                        const resizeOption = operationData.resizeOption;
                        // By default use "maximumArea"
                        let option = '@';
                        if (resizeOption === 'ignoreAspectRatio') {
                            option = '!';
                        }
                        else if (resizeOption === 'minimumArea') {
                            option = '^';
                        }
                        else if (resizeOption === 'onlyIfSmaller') {
                            option = '<';
                        }
                        else if (resizeOption === 'onlyIfLarger') {
                            option = '>';
                        }
                        else if (resizeOption === 'percent') {
                            option = '%';
                        }
                        gmInstance = gmInstance.resize(operationData.width, operationData.height, option);
                    }
                    else if (operationData.operation === 'rotate') {
                        gmInstance = gmInstance.rotate(operationData.backgroundColor, operationData.rotate);
                    }
                    else if (operationData.operation === 'shear') {
                        gmInstance = gmInstance.shear(operationData.degreesX, operationData.degreesY);
                    }
                    else if (operationData.operation === 'text') {
                        // Split the text in multiple lines
                        const lines = [];
                        let currentLine = '';
                        operationData.text.split('\n').forEach((textLine) => {
                            textLine.split(' ').forEach((textPart) => {
                                if (currentLine.length + textPart.length + 1 >
                                    operationData.lineLength) {
                                    lines.push(currentLine.trim());
                                    currentLine = `${textPart} `;
                                    return;
                                }
                                currentLine += `${textPart} `;
                            });
                            lines.push(currentLine.trim());
                            currentLine = '';
                        });
                        // Combine the lines to a single string
                        // gm escapes `"` internally, but doesn't do it for `\`
                        const renderText = lines.join('\n').replaceAll('\\', '\\\\');
                        const fonts = await getSystemFonts();
                        let font = (options.font || operationData.font);
                        if (!font) {
                            font = fonts.find((systemFont) => systemFont.includes('Arial.'));
                        }
                        if (!font) {
                            throw new NodeOperationError(this.getNode(), 'Default font not found. Select a font from the options.');
                        }
                        if (!fonts.includes(font)) {
                            throw new NodeOperationError(this.getNode(), 'The selected font is not available. Select a font from the options.');
                        }
                        const nodeVersion = this.getNode().typeVersion;
                        const gravity = nodeVersion >= 1.1
                            ? resolveGravity(operationData.horizontalAlignment, operationData.verticalAlignment)
                            : 'northwest';
                        gmInstance = gmInstance
                            .fill(operationData.fontColor)
                            .fontSize(operationData.fontSize)
                            .font(font)
                            .drawText(operationData.positionX, operationData.positionY, renderText, gravity);
                    }
                    else if (operationData.operation === 'transparent') {
                        gmInstance = gmInstance.transparent(operationData.color);
                    }
                }
                if (item.binary !== undefined && newItem.binary) {
                    // Create a shallow copy of the binary data so that the old
                    // data references which do not get changed still stay behind
                    // but the incoming data does not get changed.
                    Object.assign(newItem.binary, item.binary);
                    // Make a deep copy of the binary data we change
                    if (newItem.binary[binaryPropertyName]) {
                        newItem.binary[binaryPropertyName] = deepCopy(newItem.binary[binaryPropertyName]);
                    }
                }
                if (newItem.binary[binaryPropertyName] === undefined) {
                    newItem.binary[binaryPropertyName] = {
                        data: '',
                        mimeType: '',
                    };
                }
                if (options.quality !== undefined) {
                    gmInstance = gmInstance.quality(options.quality);
                }
                if (options.format !== undefined) {
                    const format = validateImageFormat(options.format, this.getNode());
                    gmInstance = gmInstance.setFormat(format);
                    newItem.binary[binaryPropertyName].fileExtension = options.format;
                    newItem.binary[binaryPropertyName].mimeType = `image/${options.format}`;
                    const fileName = newItem.binary[binaryPropertyName].fileName;
                    if (fileName?.includes('.')) {
                        newItem.binary[binaryPropertyName].fileName =
                            fileName.split('.').slice(0, -1).join('.') + '.' + options.format;
                    }
                }
                if (options.fileName !== undefined) {
                    newItem.binary[binaryPropertyName].fileName = options.fileName;
                }
                returnData.push(await new Promise((resolve, reject) => {
                    gmInstance.toBuffer(async (error, buffer) => {
                        cleanupFunctions.forEach(async (cleanup) => cleanup());
                        if (error) {
                            return reject(error);
                        }
                        const binaryData = await this.helpers.prepareBinaryData(Buffer.from(buffer));
                        newItem.binary[binaryPropertyName] = {
                            ...newItem.binary[binaryPropertyName],
                            ...binaryData,
                        };
                        return resolve(newItem);
                    });
                }));
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                        },
                        pairedItem: {
                            item: itemIndex,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=EditImage.node.js.map