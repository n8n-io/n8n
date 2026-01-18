/**
 * Edit Image Node Types
 *
 * Edits an image like blur, resize or adding border and text
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/editimage/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EditImageV1Params {
	operation?:
		| 'blur'
		| 'border'
		| 'composite'
		| 'create'
		| 'crop'
		| 'draw'
		| 'information'
		| 'multiStep'
		| 'resize'
		| 'rotate'
		| 'shear'
		| 'text'
		| 'transparent'
		| Expression<string>;
	/**
	 * Name of the binary property in which the image data can be found
	 * @default data
	 */
	dataPropertyName?: string | Expression<string>;
	/**
	 * The operations to perform
	 * @default {}
	 */
	operations?: Record<string, unknown>;
	/**
	 * The background color of the image to create
	 * @default #ffffff00
	 */
	backgroundColor?: string | Expression<string>;
	/**
	 * The width of the image to create
	 * @default 50
	 */
	width?: number | Expression<number>;
	/**
	 * The height of the image to create
	 * @default 50
	 */
	height?: number | Expression<number>;
	/**
	 * The primitive to draw
	 * @default rectangle
	 */
	primitive?: 'circle' | 'line' | 'rectangle' | Expression<string>;
	/**
	 * The color of the primitive to draw
	 * @default #ff000000
	 */
	color?: string | Expression<string>;
	/**
	 * X (horizontal) start position of the primitive
	 * @default 50
	 */
	startPositionX?: number | Expression<number>;
	/**
	 * Y (horizontal) start position of the primitive
	 * @default 50
	 */
	startPositionY?: number | Expression<number>;
	/**
	 * X (horizontal) end position of the primitive
	 * @default 250
	 */
	endPositionX?: number | Expression<number>;
	/**
	 * Y (horizontal) end position of the primitive
	 * @default 250
	 */
	endPositionY?: number | Expression<number>;
	/**
	 * The radius of the corner to create round corners
	 * @default 0
	 */
	cornerRadius?: number | Expression<number>;
	/**
	 * Text to write on the image
	 */
	text?: string | Expression<string>;
	/**
	 * Size of the text
	 * @default 18
	 */
	fontSize?: number | Expression<number>;
	/**
	 * Color of the text
	 * @default #000000
	 */
	fontColor?: string | Expression<string>;
	/**
	 * X (horizontal) position of the text
	 * @default 50
	 */
	positionX?: number | Expression<number>;
	/**
	 * Y (vertical) position of the text
	 * @default 50
	 */
	positionY?: number | Expression<number>;
	/**
	 * Max amount of characters in a line before a line-break should get added
	 * @default 80
	 */
	lineLength?: number | Expression<number>;
	/**
	 * How strong the blur should be
	 * @default 5
	 */
	blur?: number | Expression<number>;
	/**
	 * The sigma of the blur
	 * @default 2
	 */
	sigma?: number | Expression<number>;
	/**
	 * The width of the border
	 * @default 10
	 */
	borderWidth?: number | Expression<number>;
	/**
	 * The height of the border
	 * @default 10
	 */
	borderHeight?: number | Expression<number>;
	/**
	 * Color of the border
	 * @default #000000
	 */
	borderColor?: string | Expression<string>;
	/**
	 * The name of the binary property which contains the data of the image to composite on top of image which is found in Property Name
	 */
	dataPropertyNameComposite?: string | Expression<string>;
	/**
	 * The operator to use to combine the images
	 * @default Over
	 */
	operator?:
		| 'Add'
		| 'Atop'
		| 'Bumpmap'
		| 'Copy'
		| 'CopyBlack'
		| 'CopyBlue'
		| 'CopyCyan'
		| 'CopyGreen'
		| 'CopyMagenta'
		| 'CopyOpacity'
		| 'CopyRed'
		| 'CopyYellow'
		| 'Difference'
		| 'Divide'
		| 'In'
		| 'Minus'
		| 'Multiply'
		| 'Out'
		| 'Over'
		| 'Plus'
		| 'Subtract'
		| 'Xor'
		| Expression<string>;
	/**
	 * How to resize the image
	 * @default maximumArea
	 */
	resizeOption?:
		| 'ignoreAspectRatio'
		| 'maximumArea'
		| 'minimumArea'
		| 'onlyIfLarger'
		| 'onlyIfSmaller'
		| 'percent'
		| Expression<string>;
	/**
	 * How much the image should be rotated
	 * @default 0
	 */
	rotate?: number | Expression<number>;
	/**
	 * X (horizontal) shear degrees
	 * @default 0
	 */
	degreesX?: number | Expression<number>;
	/**
	 * Y (vertical) shear degrees
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

export type EditImageV1Node = {
	type: 'n8n-nodes-base.editImage';
	version: 1;
	config: NodeConfig<EditImageV1Params>;
	credentials?: Record<string, never>;
};

export type EditImageNode = EditImageV1Node;
