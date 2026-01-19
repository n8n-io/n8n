/**
 * Edit Image Node - Version 1
 * Edits an image like blur, resize or adding border and text
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EditImageV1Params {
	operation?: 'blur' | 'border' | 'composite' | 'create' | 'crop' | 'draw' | 'information' | 'multiStep' | 'resize' | 'rotate' | 'shear' | 'text' | 'transparent' | Expression<string>;
/**
 * Name of the binary property in which the image data can be found
 * @default data
 */
		dataPropertyName?: string | Expression<string>;
/**
 * The operations to perform
 * @displayOptions.show { operation: ["multiStep"] }
 * @default {}
 */
		operations?: {
		operations?: Array<{
			/** Operation
			 */
			operation?: 'blur' | 'border' | 'composite' | 'create' | 'crop' | 'draw' | 'rotate' | 'resize' | 'shear' | 'text' | 'transparent' | Expression<string>;
			/** The background color of the image to create
			 * @displayOptions.show { operation: ["create"] }
			 * @default #ffffff00
			 */
			backgroundColor?: string | Expression<string>;
			/** The width of the image to create
			 * @displayOptions.show { operation: ["create"] }
			 * @default 50
			 */
			width?: number | Expression<number>;
			/** The height of the image to create
			 * @displayOptions.show { operation: ["create"] }
			 * @default 50
			 */
			height?: number | Expression<number>;
			/** The primitive to draw
			 * @displayOptions.show { operation: ["draw"] }
			 * @default rectangle
			 */
			primitive?: 'circle' | 'line' | 'rectangle' | Expression<string>;
			/** The color of the primitive to draw
			 * @displayOptions.show { operation: ["draw"] }
			 * @default #ff000000
			 */
			color?: string | Expression<string>;
			/** X (horizontal) start position of the primitive
			 * @displayOptions.show { operation: ["draw"], primitive: ["circle", "line", "rectangle"] }
			 * @default 50
			 */
			startPositionX?: number | Expression<number>;
			/** Y (horizontal) start position of the primitive
			 * @displayOptions.show { operation: ["draw"], primitive: ["circle", "line", "rectangle"] }
			 * @default 50
			 */
			startPositionY?: number | Expression<number>;
			/** X (horizontal) end position of the primitive
			 * @displayOptions.show { operation: ["draw"], primitive: ["circle", "line", "rectangle"] }
			 * @default 250
			 */
			endPositionX?: number | Expression<number>;
			/** Y (horizontal) end position of the primitive
			 * @displayOptions.show { operation: ["draw"], primitive: ["circle", "line", "rectangle"] }
			 * @default 250
			 */
			endPositionY?: number | Expression<number>;
			/** The radius of the corner to create round corners
			 * @displayOptions.show { operation: ["draw"], primitive: ["rectangle"] }
			 * @default 0
			 */
			cornerRadius?: number | Expression<number>;
			/** Text to write on the image
			 * @displayOptions.show { operation: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Size of the text
			 * @displayOptions.show { operation: ["text"] }
			 * @default 18
			 */
			fontSize?: number | Expression<number>;
			/** Color of the text
			 * @displayOptions.show { operation: ["text"] }
			 * @default #000000
			 */
			fontColor?: string | Expression<string>;
			/** X (horizontal) position of the text
			 * @displayOptions.show { operation: ["text"] }
			 * @default 50
			 */
			positionX?: number | Expression<number>;
			/** Y (vertical) position of the text
			 * @displayOptions.show { operation: ["text"] }
			 * @default 50
			 */
			positionY?: number | Expression<number>;
			/** Max amount of characters in a line before a line-break should get added
			 * @displayOptions.show { operation: ["text"] }
			 * @default 80
			 */
			lineLength?: number | Expression<number>;
			/** How strong the blur should be
			 * @displayOptions.show { operation: ["blur"] }
			 * @default 5
			 */
			blur?: number | Expression<number>;
			/** The sigma of the blur
			 * @displayOptions.show { operation: ["blur"] }
			 * @default 2
			 */
			sigma?: number | Expression<number>;
			/** The width of the border
			 * @displayOptions.show { operation: ["border"] }
			 * @default 10
			 */
			borderWidth?: number | Expression<number>;
			/** The height of the border
			 * @displayOptions.show { operation: ["border"] }
			 * @default 10
			 */
			borderHeight?: number | Expression<number>;
			/** Color of the border
			 * @displayOptions.show { operation: ["border"] }
			 * @default #000000
			 */
			borderColor?: string | Expression<string>;
			/** The name of the binary property which contains the data of the image to composite on top of image which is found in Property Name
			 * @displayOptions.show { operation: ["composite"] }
			 */
			dataPropertyNameComposite?: string | Expression<string>;
			/** The operator to use to combine the images
			 * @displayOptions.show { operation: ["composite"] }
			 * @default Over
			 */
			operator?: 'Add' | 'Atop' | 'Bumpmap' | 'Copy' | 'CopyBlack' | 'CopyBlue' | 'CopyCyan' | 'CopyGreen' | 'CopyMagenta' | 'CopyOpacity' | 'CopyRed' | 'CopyYellow' | 'Difference' | 'Divide' | 'In' | 'Minus' | 'Multiply' | 'Out' | 'Over' | 'Plus' | 'Subtract' | 'Xor' | Expression<string>;
			/** X (horizontal) position of composite image
			 * @displayOptions.show { operation: ["composite"] }
			 * @default 0
			 */
			positionX?: number | Expression<number>;
			/** Y (vertical) position of composite image
			 * @displayOptions.show { operation: ["composite"] }
			 * @default 0
			 */
			positionY?: number | Expression<number>;
			/** Crop width
			 * @displayOptions.show { operation: ["crop"] }
			 * @default 500
			 */
			width?: number | Expression<number>;
			/** Crop height
			 * @displayOptions.show { operation: ["crop"] }
			 * @default 500
			 */
			height?: number | Expression<number>;
			/** X (horizontal) position to crop from
			 * @displayOptions.show { operation: ["crop"] }
			 * @default 0
			 */
			positionX?: number | Expression<number>;
			/** Y (vertical) position to crop from
			 * @displayOptions.show { operation: ["crop"] }
			 * @default 0
			 */
			positionY?: number | Expression<number>;
			/** New width of the image
			 * @displayOptions.show { operation: ["resize"] }
			 * @default 500
			 */
			width?: number | Expression<number>;
			/** New height of the image
			 * @displayOptions.show { operation: ["resize"] }
			 * @default 500
			 */
			height?: number | Expression<number>;
			/** How to resize the image
			 * @displayOptions.show { operation: ["resize"] }
			 * @default maximumArea
			 */
			resizeOption?: 'ignoreAspectRatio' | 'maximumArea' | 'minimumArea' | 'onlyIfLarger' | 'onlyIfSmaller' | 'percent' | Expression<string>;
			/** How much the image should be rotated
			 * @displayOptions.show { operation: ["rotate"] }
			 * @default 0
			 */
			rotate?: number | Expression<number>;
			/** The color to use for the background when image gets rotated by anything which is not a multiple of 90
			 * @displayOptions.show { operation: ["rotate"] }
			 * @default #ffffffff
			 */
			backgroundColor?: string | Expression<string>;
			/** X (horizontal) shear degrees
			 * @displayOptions.show { operation: ["shear"] }
			 * @default 0
			 */
			degreesX?: number | Expression<number>;
			/** Y (vertical) shear degrees
			 * @displayOptions.show { operation: ["shear"] }
			 * @default 0
			 */
			degreesY?: number | Expression<number>;
			/** The color to make transparent
			 * @displayOptions.show { operation: ["transparent"] }
			 * @default #ff0000
			 */
			color?: string | Expression<string>;
			/** The font to use. Defaults to Arial. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { operation: ["text"] }
			 */
			font?: string | Expression<string>;
		}>;
	};
/**
 * The background color of the image to create
 * @displayOptions.show { operation: ["create"] }
 * @default #ffffff00
 */
		backgroundColor?: string | Expression<string>;
/**
 * The width of the image to create
 * @displayOptions.show { operation: ["create"] }
 * @default 50
 */
		width?: number | Expression<number>;
/**
 * The height of the image to create
 * @displayOptions.show { operation: ["create"] }
 * @default 50
 */
		height?: number | Expression<number>;
/**
 * The primitive to draw
 * @displayOptions.show { operation: ["draw"] }
 * @default rectangle
 */
		primitive?: 'circle' | 'line' | 'rectangle' | Expression<string>;
/**
 * The color of the primitive to draw
 * @displayOptions.show { operation: ["draw"] }
 * @default #ff000000
 */
		color?: string | Expression<string>;
/**
 * X (horizontal) start position of the primitive
 * @displayOptions.show { operation: ["draw"], primitive: ["circle", "line", "rectangle"] }
 * @default 50
 */
		startPositionX?: number | Expression<number>;
/**
 * Y (horizontal) start position of the primitive
 * @displayOptions.show { operation: ["draw"], primitive: ["circle", "line", "rectangle"] }
 * @default 50
 */
		startPositionY?: number | Expression<number>;
/**
 * X (horizontal) end position of the primitive
 * @displayOptions.show { operation: ["draw"], primitive: ["circle", "line", "rectangle"] }
 * @default 250
 */
		endPositionX?: number | Expression<number>;
/**
 * Y (horizontal) end position of the primitive
 * @displayOptions.show { operation: ["draw"], primitive: ["circle", "line", "rectangle"] }
 * @default 250
 */
		endPositionY?: number | Expression<number>;
/**
 * The radius of the corner to create round corners
 * @displayOptions.show { operation: ["draw"], primitive: ["rectangle"] }
 * @default 0
 */
		cornerRadius?: number | Expression<number>;
/**
 * Text to write on the image
 * @displayOptions.show { operation: ["text"] }
 */
		text?: string | Expression<string>;
/**
 * Size of the text
 * @displayOptions.show { operation: ["text"] }
 * @default 18
 */
		fontSize?: number | Expression<number>;
/**
 * Color of the text
 * @displayOptions.show { operation: ["text"] }
 * @default #000000
 */
		fontColor?: string | Expression<string>;
/**
 * X (horizontal) position of the text
 * @displayOptions.show { operation: ["text"] }
 * @default 50
 */
		positionX?: number | Expression<number>;
/**
 * Y (vertical) position of the text
 * @displayOptions.show { operation: ["text"] }
 * @default 50
 */
		positionY?: number | Expression<number>;
/**
 * Max amount of characters in a line before a line-break should get added
 * @displayOptions.show { operation: ["text"] }
 * @default 80
 */
		lineLength?: number | Expression<number>;
/**
 * How strong the blur should be
 * @displayOptions.show { operation: ["blur"] }
 * @default 5
 */
		blur?: number | Expression<number>;
/**
 * The sigma of the blur
 * @displayOptions.show { operation: ["blur"] }
 * @default 2
 */
		sigma?: number | Expression<number>;
/**
 * The width of the border
 * @displayOptions.show { operation: ["border"] }
 * @default 10
 */
		borderWidth?: number | Expression<number>;
/**
 * The height of the border
 * @displayOptions.show { operation: ["border"] }
 * @default 10
 */
		borderHeight?: number | Expression<number>;
/**
 * Color of the border
 * @displayOptions.show { operation: ["border"] }
 * @default #000000
 */
		borderColor?: string | Expression<string>;
/**
 * The name of the binary property which contains the data of the image to composite on top of image which is found in Property Name
 * @displayOptions.show { operation: ["composite"] }
 */
		dataPropertyNameComposite?: string | Expression<string>;
/**
 * The operator to use to combine the images
 * @displayOptions.show { operation: ["composite"] }
 * @default Over
 */
		operator?: 'Add' | 'Atop' | 'Bumpmap' | 'Copy' | 'CopyBlack' | 'CopyBlue' | 'CopyCyan' | 'CopyGreen' | 'CopyMagenta' | 'CopyOpacity' | 'CopyRed' | 'CopyYellow' | 'Difference' | 'Divide' | 'In' | 'Minus' | 'Multiply' | 'Out' | 'Over' | 'Plus' | 'Subtract' | 'Xor' | Expression<string>;
/**
 * How to resize the image
 * @displayOptions.show { operation: ["resize"] }
 * @default maximumArea
 */
		resizeOption?: 'ignoreAspectRatio' | 'maximumArea' | 'minimumArea' | 'onlyIfLarger' | 'onlyIfSmaller' | 'percent' | Expression<string>;
/**
 * How much the image should be rotated
 * @displayOptions.show { operation: ["rotate"] }
 * @default 0
 */
		rotate?: number | Expression<number>;
/**
 * X (horizontal) shear degrees
 * @displayOptions.show { operation: ["shear"] }
 * @default 0
 */
		degreesX?: number | Expression<number>;
/**
 * Y (vertical) shear degrees
 * @displayOptions.show { operation: ["shear"] }
 * @default 0
 */
		degreesY?: number | Expression<number>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface EditImageV1NodeBase {
	type: 'n8n-nodes-base.editImage';
	version: 1;
}

export type EditImageV1ParamsNode = EditImageV1NodeBase & {
	config: NodeConfig<EditImageV1Params>;
};

export type EditImageV1Node = EditImageV1ParamsNode;