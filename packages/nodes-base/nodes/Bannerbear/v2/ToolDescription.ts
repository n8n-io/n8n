import type { INodeProperties } from 'n8n-workflow';

export const toolOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['tool'],
			},
		},
		options: [
			{
				name: 'Add Audio',
				value: 'addAudio',
				description: 'Mix an audio track over a video, or replace the original',
				action: 'Add audio to a video',
			},
			{
				name: 'Add Cover Art',
				value: 'addCoverArt',
				description: 'Embed a still image as the poster thumbnail for a video',
				action: 'Add cover art to a video',
			},
			{
				name: 'Apply Color Filter',
				value: 'applyColorFilter',
				description: 'Apply a named colour-grade preset to a video',
				action: 'Apply a color filter to a video',
			},
			{
				name: 'Create PDF',
				value: 'createPdf',
				description: 'Combine images and PDFs into one multi-page document',
				action: 'Create a PDF',
			},
			{
				name: 'Create Video Slideshow',
				value: 'createVideoSlideshow',
				description: 'Turn a series of images into an MP4 slideshow',
				action: 'Create a video slideshow',
			},
			{
				name: 'Crop Video',
				value: 'cropVideo',
				description: 'Crop a video to an exact rectangle',
				action: 'Crop a video',
			},
			{
				name: 'Generate Voiceover',
				value: 'generateVoiceover',
				description: 'Turn text into spoken audio',
				action: 'Generate a voiceover',
			},
			{
				name: 'Join Videos',
				value: 'joinVideos',
				description: 'Join two or more videos end to end',
				action: 'Join videos',
			},
			{
				name: 'Overlay Image',
				value: 'overlayImage',
				description: 'Burn a logo, watermark, or badge onto a video',
				action: 'Overlay an image on a video',
			},
			{
				name: 'Overlay Video',
				value: 'overlayVideo',
				description: 'Layer one video on another as picture in picture',
				action: 'Overlay a video on a video',
			},
			{
				name: 'Remove Background',
				value: 'removeBackground',
				description: 'Cut the subject out of an image against transparency',
				action: 'Remove an image background',
			},
			{
				name: 'Resize Video',
				value: 'resizeVideo',
				description: 'Rescale a video to target dimensions',
				action: 'Resize a video',
			},
			{
				name: 'Soften Video',
				value: 'softenVideo',
				description: 'Smooth skin and flat surfaces while keeping edges sharp',
				action: 'Soften a video',
			},
			{
				name: 'Subtitle Video',
				value: 'subtitleVideo',
				description: 'Transcribe the audio and burn styled subtitles onto the video',
				action: 'Subtitle a video',
			},
			{
				name: 'Trim Video',
				value: 'trimVideo',
				description: 'Keep a slice of a video by start and end time',
				action: 'Trim a video',
			},
		],
		default: 'removeBackground',
	},
];

export const toolFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                          tool:removeBackground                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['removeBackground'],
			},
		},
		description: 'Publicly reachable URL of the source PNG or JPG',
	},
	/* -------------------------------------------------------------------------- */
	/*                             tool:createPdf                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Source URLs',
		name: 'urls',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['createPdf'],
			},
		},
		description: 'One JPG, PNG, or PDF URL per line. Page order is preserved.',
	},
	/* -------------------------------------------------------------------------- */
	/*                        video tools: source video                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: [
					'trimVideo',
					'resizeVideo',
					'cropVideo',
					'overlayImage',
					'subtitleVideo',
					'addAudio',
					'addCoverArt',
					'applyColorFilter',
					'softenVideo',
				],
			},
		},
		description: 'Publicly reachable URL of the source video',
	},
	/* -------------------------------------------------------------------------- */
	/*                              tool:trimVideo                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Start',
		name: 'start',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['trimVideo'],
			},
		},
		description: 'Start position in seconds',
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['trimVideo'],
			},
		},
		description: 'End position in seconds',
	},
	/* -------------------------------------------------------------------------- */
	/*                             tool:joinVideos                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Video URLs',
		name: 'videoUrls',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['joinVideos'],
			},
		},
		description: 'One video URL per line, in play order. Two or more are required.',
	},
	{
		displayName: 'Options',
		name: 'joinOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['joinVideos'],
			},
		},
		options: [
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				default: 720,
				description: 'Output height in pixels',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: 1280,
				description: 'Output width in pixels',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                        tool:resizeVideo / cropVideo                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Width',
		name: 'width',
		type: 'number',
		required: true,
		default: 1280,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['resizeVideo', 'cropVideo'],
			},
		},
		description: 'Target width in pixels',
	},
	{
		displayName: 'Height',
		name: 'height',
		type: 'number',
		required: true,
		default: 720,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['resizeVideo', 'cropVideo'],
			},
		},
		description: 'Target height in pixels',
	},
	{
		displayName: 'Fit',
		name: 'fit',
		type: 'options',
		options: [
			{
				name: 'Contain',
				value: 'contain',
				description: 'Letterbox to fit inside the target size',
			},
			{
				name: 'Cover',
				value: 'cover',
				description: 'Crop to fill the target size',
			},
		],
		default: 'cover',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['resizeVideo'],
			},
		},
		description: 'How to fit the source into the target size',
	},
	/* -------------------------------------------------------------------------- */
	/*                    position, shared by crop and overlays                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'X',
		name: 'x',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['cropVideo', 'overlayVideo', 'overlayImage'],
			},
		},
		description: 'Left offset in pixels',
	},
	{
		displayName: 'Y',
		name: 'y',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['cropVideo', 'overlayVideo', 'overlayImage'],
			},
		},
		description: 'Top offset in pixels',
	},
	/* -------------------------------------------------------------------------- */
	/*                            tool:overlayVideo                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Base Video URL',
		name: 'baseVideoUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayVideo'],
			},
		},
		description: 'Publicly reachable URL of the video underneath',
	},
	{
		displayName: 'Overlay Video URL',
		name: 'overlayVideoUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayVideo'],
			},
		},
		description: 'Publicly reachable URL of the video placed on top',
	},
	{
		displayName: 'Options',
		name: 'overlayVideoOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayVideo'],
			},
		},
		options: [
			{
				displayName: 'Scale',
				name: 'scale',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: 1,
				description: 'Size of the overlay, where 1 is original size',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'number',
				default: 0,
				description: 'When the overlay begins, in seconds',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                            tool:overlayImage                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Overlay Image URL',
		name: 'overlayImageUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayImage'],
			},
		},
		description: 'Publicly reachable URL of the logo, watermark, or badge',
	},
	{
		displayName: 'Options',
		name: 'overlayImageOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayImage'],
			},
		},
		options: [
			{
				displayName: 'Opacity',
				name: 'opacity',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				default: 1,
				description: 'Overlay opacity between 0 and 1',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                             tool:subtitleVideo                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Options',
		name: 'subtitleOptions',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Alignment',
				name: 'alignment',
				type: 'options',
				options: [
					{ name: 'Bottom Center', value: '2' },
					{ name: 'Bottom Left', value: '1' },
					{ name: 'Bottom Right', value: '3' },
					{ name: 'Middle Center', value: '5' },
					{ name: 'Middle Left', value: '4' },
					{ name: 'Middle Right', value: '6' },
					{ name: 'Top Center', value: '8' },
					{ name: 'Top Left', value: '7' },
					{ name: 'Top Right', value: '9' },
				],
				default: '2',
				description: 'Where subtitles sit on the frame',
			},
			{
				displayName: 'Background Color',
				name: 'background_color',
				type: 'color',
				default: '',
				description: 'Only used when Background Style is Box',
			},
			{
				displayName: 'Background Style',
				name: 'background_style',
				type: 'options',
				options: [
					{ name: 'Box', value: 'box' },
					{ name: 'None', value: 'none' },
					{ name: 'Outline', value: 'outline' },
				],
				default: 'outline',
				description: 'How the text is separated from the video',
			},
			{
				displayName: 'Bold',
				name: 'bold',
				type: 'options',
				options: [
					{ name: 'Off', value: 'off' },
					{ name: 'On', value: 'on' },
				],
				default: 'off',
				description: 'Whether to embolden the subtitles',
			},
			{
				displayName: 'Font',
				name: 'font',
				type: 'options',
				options: [
					{ name: 'Anton', value: 'anton' },
					{ name: 'Bebas Neue', value: 'bebas-neue' },
					{ name: 'Inter', value: 'inter' },
					{ name: 'Montserrat', value: 'montserrat' },
					{ name: 'Noto Sans', value: 'noto-sans' },
					{ name: 'Open Sans', value: 'open-sans' },
					{ name: 'Oswald', value: 'oswald' },
					{ name: 'Playfair Display', value: 'playfair-display' },
					{ name: 'Poppins', value: 'poppins' },
					{ name: 'Roboto', value: 'roboto' },
				],
				default: 'inter',
				description: 'Typeface for the subtitles',
			},
			{
				displayName: 'Font Size',
				name: 'font_size',
				type: 'number',
				default: 28,
				description: 'Subtitle text size',
			},
			{
				displayName: 'Italic',
				name: 'italic',
				type: 'options',
				options: [
					{ name: 'Off', value: 'off' },
					{ name: 'On', value: 'on' },
				],
				default: 'off',
				description: 'Whether to italicise the subtitles',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: [
					{ name: 'Arabic', value: 'ar' },
					{ name: 'Auto Detect', value: '' },
					{ name: 'Chinese', value: 'zh' },
					{ name: 'Dutch', value: 'nl' },
					{ name: 'English', value: 'en' },
					{ name: 'French', value: 'fr' },
					{ name: 'German', value: 'de' },
					{ name: 'Hindi', value: 'hi' },
					{ name: 'Indonesian', value: 'id' },
					{ name: 'Italian', value: 'it' },
					{ name: 'Japanese', value: 'ja' },
					{ name: 'Korean', value: 'ko' },
					{ name: 'Polish', value: 'pl' },
					{ name: 'Portuguese', value: 'pt' },
					{ name: 'Russian', value: 'ru' },
					{ name: 'Spanish', value: 'es' },
					{ name: 'Thai', value: 'th' },
					{ name: 'Turkish', value: 'tr' },
					{ name: 'Vietnamese', value: 'vi' },
				],
				default: '',
				description: 'Spoken language, or auto detect',
			},
			{
				displayName: 'Outline Color',
				name: 'outline_color',
				type: 'color',
				default: '#000000',
				description: 'Colour of the text outline',
			},
			{
				displayName: 'Outline Width',
				name: 'outline_width',
				type: 'number',
				default: 0,
				description: 'Thickness of the text outline, 0 for none',
			},
			{
				displayName: 'Shadow Color',
				name: 'shadow_color',
				type: 'color',
				default: '#000000',
				description: 'Colour of the drop shadow',
			},
			{
				displayName: 'Shadow Size',
				name: 'shadow_size',
				type: 'number',
				default: 0,
				description: 'Drop shadow offset, 0 for none',
			},
			{
				displayName: 'Text Color',
				name: 'color',
				type: 'color',
				default: '#ffffff',
				description: 'Colour of the subtitle text',
			},
		],
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['subtitleVideo'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                           tool:generateVoiceover                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['generateVoiceover'],
			},
		},
		description: 'What the voice should say, up to 2000 characters',
	},
	{
		displayName: 'Voice',
		name: 'voice',
		type: 'options',
		options: [
			{
				name: 'Adam',
				value: 'adam',
			},
			{
				name: 'Antoni',
				value: 'antoni',
			},
			{
				name: 'Arnold',
				value: 'arnold',
			},
			{
				name: 'Bella',
				value: 'bella',
			},
			{
				name: 'Charlie',
				value: 'charlie',
			},
			{
				name: 'Domi',
				value: 'domi',
			},
			{
				name: 'Elli',
				value: 'elli',
			},
			{
				name: 'Freya',
				value: 'freya',
			},
			{
				name: 'Josh',
				value: 'josh',
			},
			{
				name: 'Rachel',
				value: 'rachel',
			},
		],
		required: true,
		default: 'rachel',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['generateVoiceover'],
			},
		},
		description: 'Which pre-made voice to speak with',
	},
	/* -------------------------------------------------------------------------- */
	/*                               tool:addAudio                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Audio URL',
		name: 'audioUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['addAudio'],
			},
		},
		description: 'Publicly reachable URL of the audio track',
	},
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		options: [
			{
				name: 'Mix',
				value: 'mix',
			},
			{
				name: 'Replace',
				value: 'replace',
			},
		],
		required: true,
		default: 'mix',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['addAudio'],
			},
		},
		description: 'Whether to mix with or replace the original audio',
	},
	{
		displayName: 'Options',
		name: 'addAudioOptions',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Ducking',
				name: 'ducking',
				type: 'options',
				options: [
					{ name: 'Heavy', value: 'heavy' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'Off', value: 'off' },
					{ name: 'Subtle', value: 'subtle' },
				],
				default: 'off',
				description: 'Dip the new audio when the original audio plays. Mix mode only.',
			},
			{
				displayName: 'Loop',
				name: 'loop',
				type: 'options',
				options: [
					{ name: 'Off', value: 'off' },
					{ name: 'On', value: 'on' },
				],
				default: 'on',
				description: 'Whether to loop the audio to match the video length',
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'number',
				default: 1,
				description: 'Level of the new audio, where 1 is its original level',
			},
		],
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['addAudio'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                              tool:addCoverArt                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Cover Image URL',
		name: 'coverImageUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['addCoverArt'],
			},
		},
		description: 'Publicly reachable URL of the poster image',
	},
	/* -------------------------------------------------------------------------- */
	/*                         tool:createVideoSlideshow                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Image URLs',
		name: 'imageUrls',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['createVideoSlideshow'],
			},
		},
		description: 'One image URL per line, in slide order. Two or more are required.',
	},
	{
		displayName: 'Options',
		name: 'slideshowOptions',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				default: 720,
				description: 'Output height in pixels',
			},
			{
				displayName: 'Slide Duration',
				name: 'slide_duration',
				type: 'number',
				default: 3,
				description: 'Seconds each slide stays on screen',
			},
			{
				displayName: 'Transition',
				name: 'transition',
				type: 'options',
				options: [
					{ name: 'Dissolve', value: 'dissolve' },
					{ name: 'Fade', value: 'fade' },
					{ name: 'None', value: 'none' },
					{ name: 'Slide Left', value: 'slideleft' },
					{ name: 'Wipe Left', value: 'wipeleft' },
				],
				default: 'none',
				description: 'How each slide flows into the next',
			},
			{
				displayName: 'Transition Duration',
				name: 'transition_duration',
				type: 'number',
				default: 1,
				description: 'Seconds each transition takes',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: 1280,
				description: 'Output width in pixels',
			},
		],
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['createVideoSlideshow'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                           tool:applyColorFilter                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'options',
		options: [
			{
				name: 'Black and White',
				value: 'black-and-white',
			},
			{
				name: 'Bleach Bypass',
				value: 'bleach-bypass',
			},
			{
				name: 'Cool',
				value: 'cool',
			},
			{
				name: 'Cross Process',
				value: 'cross-process',
			},
			{
				name: 'Dark and Moody',
				value: 'dark-and-moody',
			},
			{
				name: 'Faded',
				value: 'faded',
			},
			{
				name: 'Invert',
				value: 'invert',
			},
			{
				name: 'Muted',
				value: 'muted',
			},
			{
				name: 'Sepia',
				value: 'sepia',
			},
			{
				name: 'Teal and Orange',
				value: 'teal-and-orange',
			},
			{
				name: 'Vintage',
				value: 'vintage',
			},
			{
				name: 'Vivid',
				value: 'vivid',
			},
			{
				name: 'Warm',
				value: 'warm',
			},
		],
		required: true,
		default: 'vintage',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['applyColorFilter'],
			},
		},
		description: 'Which preset colour grade to apply',
	},
	/* -------------------------------------------------------------------------- */
	/*                              tool:softenVideo                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Strength',
		name: 'strength',
		type: 'options',
		options: [
			{
				name: 'Medium',
				value: 'medium',
			},
			{
				name: 'Strong',
				value: 'strong',
			},
			{
				name: 'Subtle',
				value: 'subtle',
			},
		],
		required: true,
		default: 'medium',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['softenVideo'],
			},
		},
		description: 'How much smoothing to apply',
	},
	/* -------------------------------------------------------------------------- */
	/*                       shared across every tool                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
			},
		},
		description: 'Value stored with the job, so you can match a result back to its source',
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['tool'],
			},
		},
		description:
			'Whether to poll until the job finishes. Turn this off to return a pending job immediately.',
	},
	{
		displayName: 'Max Tries',
		name: 'maxTries',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		default: 30,
		displayOptions: {
			show: {
				resource: ['tool'],
				waitForCompletion: [true],
			},
		},
		description: 'How many times to check the job before giving up, at two seconds apart',
	},
];

export const toolJobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['toolJob'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a tool job',
				action: 'Get a tool job',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many tool jobs',
				action: 'Get many tool jobs',
			},
		],
		default: 'get',
	},
];

export const toolJobFields: INodeProperties[] = [
	{
		displayName: 'Tool Job ID',
		name: 'toolJobId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['toolJob'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier returned when the tool job was created',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['toolJob'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				resource: ['toolJob'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
