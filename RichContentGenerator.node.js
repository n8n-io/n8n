const { NodeConnectionType } = require('n8n-workflow');

// Generate chart content with improved error handling and unique IDs
function generateChart(item) {
	const data = item.json;
	
	// Extract chart data from input or use defaults
	const chartData = data.chartData || data.values || [10, 25, 15, 30, 22, 35, 28];
	const labels = data.labels || data.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const title = data.title || data.chartTitle || 'Data Visualization';
	
	// Generate unique ID for this chart instance
	const chartId = 'dataChart_' + Math.random().toString(36).substr(2, 9);
	
	return {
		html: `
			<div class="chart-container">
				<h3>📈 ${title}</h3>
				<canvas id="${chartId}" width="400" height="200"></canvas>
				<div class="chart-info">
					<p>Interactive chart with ${Array.isArray(chartData) ? chartData.length : 0} data points</p>
				</div>
			</div>
		`,
		css: `
			.chart-container {
				background: white;
				padding: 24px;
				border-radius: 12px;
				box-shadow: 0 4px 15px rgba(0,0,0,0.1);
				text-align: center;
			}
			.chart-container canvas {
				border: 1px solid #e1e8ed;
				border-radius: 8px;
				margin: 10px 0;
			}
			.chart-info {
				color: #6c757d;
				font-size: 0.9em;
				margin-top: 10px;
			}
		`,
		script: `
			// Wait for DOM to be ready and ensure elements exist
			let retryCount = 0;
			const maxRetries = 20;
			const chartId = '${chartId}';
			
			function initChart() {
				try {
					// Find the container - works in both chat and logs contexts
					let currentContainer = null;
					
					// Try different container contexts
					if (typeof container !== 'undefined' && container) {
						currentContainer = container;
					} else if (document.currentScript && document.currentScript.parentElement) {
						currentContainer = document.currentScript.parentElement;
					} else {
						// Fallback to document
						currentContainer = document;
					}
					
					console.log('[Rich Content] [Chart] Using container:', currentContainer);
					console.log('[Rich Content] [Chart] Looking for canvas with ID:', chartId);
					
					const canvas = currentContainer.querySelector('#' + chartId);
					if (!canvas) {
						retryCount++;
						if (retryCount < maxRetries) {
							const delay = Math.min(100 * retryCount, 2000); // Exponential backoff up to 2s
							console.warn('[Rich Content] [Chart] Canvas not found, retry', retryCount, 'in', delay, 'ms');
							setTimeout(initChart, delay);
							return;
						} else {
							console.error('[Rich Content] [Chart] Canvas not found after', maxRetries, 'retries');
							return;
						}
					}
				
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						console.error('[Rich Content] [Chart] Could not get canvas context');
						return;
					}
					
					console.log('[Rich Content] [Chart] Canvas found, starting render...');
					
					// Chart data (embedded, no external loading)
					const chartData = ${JSON.stringify(chartData)};
					const labels = ${JSON.stringify(labels)};
					
					const width = canvas.width;
					const height = canvas.height;
					const padding = 50;
					
					// Clear canvas
					ctx.clearRect(0, 0, width, height);
					
					// Draw background
					ctx.fillStyle = '#f8f9fa';
					ctx.fillRect(0, 0, width, height);
					
					// Draw grid lines
					ctx.strokeStyle = '#e1e8ed';
					ctx.lineWidth = 1;
					ctx.setLineDash([2, 2]);
					
					// Vertical grid lines
					for (let i = 0; i < chartData.length; i++) {
						const x = padding + (i * (width - 2 * padding) / (chartData.length - 1));
						ctx.beginPath();
						ctx.moveTo(x, padding);
						ctx.lineTo(x, height - padding);
						ctx.stroke();
					}
					
					// Horizontal grid lines
					const maxValue = Math.max(...chartData);
					for (let i = 0; i <= 5; i++) {
						const y = padding + (i * (height - 2 * padding) / 5);
						ctx.beginPath();
						ctx.moveTo(padding, y);
						ctx.lineTo(width - padding, y);
						ctx.stroke();
					}
					
					ctx.setLineDash([]);
					
					// Draw axes
					ctx.strokeStyle = '#333';
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(padding, height - padding);
					ctx.lineTo(width - padding, height - padding);
					ctx.moveTo(padding, height - padding);
					ctx.lineTo(padding, padding);
					ctx.stroke();
					
					// Draw data line
					const stepX = (width - 2 * padding) / (chartData.length - 1);
					const stepY = (height - 2 * padding) / maxValue;
					
					ctx.strokeStyle = '#007acc';
					ctx.lineWidth = 3;
					ctx.beginPath();
					
					chartData.forEach((value, index) => {
						const x = padding + index * stepX;
						const y = height - padding - (value * stepY);
						
						if (index === 0) {
							ctx.moveTo(x, y);
						} else {
							ctx.lineTo(x, y);
						}
					});
					
					ctx.stroke();
					
					// Draw data points
					chartData.forEach((value, index) => {
						const x = padding + index * stepX;
						const y = height - padding - (value * stepY);
						
						ctx.fillStyle = '#007acc';
						ctx.beginPath();
						ctx.arc(x, y, 6, 0, 2 * Math.PI);
						ctx.fill();
						
						// Draw value labels
						ctx.fillStyle = '#333';
						ctx.font = '12px Arial';
						ctx.textAlign = 'center';
						ctx.fillText(value.toString(), x, y - 15);
					});
					
					// Draw x-axis labels
					ctx.fillStyle = '#666';
					ctx.font = '11px Arial';
					labels.forEach((label, index) => {
						const x = padding + index * stepX;
						ctx.fillText(label, x, height - padding + 20);
					});
					
					console.log('[Rich Content] [Chart] Chart rendered successfully with embedded data');
				} catch (error) {
					console.error('[Rich Content] [Chart] Error rendering chart:', error);
				}
			}
			
			// Initialize chart when ready
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', function() {
					setTimeout(initChart, 100); // Give extra time for DOM insertion
				});
			} else {
				// Use longer timeout to ensure the HTML is fully inserted
				setTimeout(initChart, 200);
			}
		`,
	};
}

// Generate weather card content
function generateWeatherCard(item) {
	const data = item.json;
	
	// Extract weather data from input or use defaults
	const temperature = data.temperature || data.temp || 22;
	const condition = data.condition || data.weather || 'Sunny';
	const location = data.location || data.city || 'New York';
	const humidity = data.humidity || 65;
	const windSpeed = data.windSpeed || data.wind || 12;
	
	return {
		html: `
			<div class="weather-card">
				<div class="weather-header">
					<h2>🌤️ ${condition}</h2>
					<p class="location">📍 ${location}</p>
				</div>
				<div class="weather-body">
					<div class="temperature">${temperature}°C</div>
					<div class="details">
						<div class="detail">
							<span class="label">💧 Humidity:</span>
							<span class="value">${humidity}%</span>
						</div>
						<div class="detail">
							<span class="label">💨 Wind:</span>
							<span class="value">${windSpeed} km/h</span>
						</div>
					</div>
				</div>
			</div>
		`,
		css: `
			.weather-card {
				background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
				color: white;
				padding: 24px;
				border-radius: 16px;
				box-shadow: 0 8px 32px rgba(0,0,0,0.1);
				max-width: 300px;
				text-align: center;
			}
			.weather-header h2 {
				margin: 0 0 8px 0;
				font-size: 1.5em;
			}
			.location {
				margin: 0 0 20px 0;
				opacity: 0.9;
			}
			.temperature {
				font-size: 3em;
				font-weight: bold;
				margin: 20px 0;
			}
			.details {
				display: flex;
				justify-content: space-between;
				margin-top: 20px;
			}
			.detail {
				display: flex;
				flex-direction: column;
				align-items: center;
			}
			.label {
				font-size: 0.9em;
				opacity: 0.8;
				margin-bottom: 4px;
			}
			.value {
				font-weight: bold;
			}
		`,
		script: 'console.log("[Rich Content] Weather card rendered successfully");',
	};
}

// Main node class
class RichContentGenerator {
	constructor() {
		this.description = {
			displayName: 'Rich Content Generator',
			name: 'richContentGenerator',
			icon: 'file:richcontent.svg',
			group: ['transform'],
			version: 1,
			subtitle: '={{$parameter["contentType"]}}',
			description: 'Generate rich HTML content with interactive elements',
			defaults: {
				name: 'Rich Content Generator',
			},
			inputs: [NodeConnectionType.Main],
			outputs: [NodeConnectionType.Main],
			properties: [
				{
					displayName: 'Content Type',
					name: 'contentType',
					type: 'options',
					options: [
						{
							name: 'Weather Card',
							value: 'weather',
							description: 'Generate an interactive weather card',
						},
						{
							name: 'Chart',
							value: 'chart',
							description: 'Generate an interactive data chart',
						},
					],
					default: 'chart',
					description: 'Type of rich content to generate',
				},
				{
					displayName: 'Sanitize Content',
					name: 'sanitize',
					type: 'boolean',
					default: false,
					description: 'Whether to sanitize the HTML content for security',
				},
			],
		};
	}

	async execute() {
		const items = this.getInputData();
		const returnData = [];

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const contentType = this.getNodeParameter('contentType', i);
			const sanitize = this.getNodeParameter('sanitize', i);

			let richContent;

			// Generate content based on type
			switch (contentType) {
				case 'weather':
					richContent = generateWeatherCard(item);
					break;
				case 'chart':
					richContent = generateChart(item);
					break;
				default:
					richContent = generateChart(item);
			}

			// Template replacement function
			const replaceTemplates = (content) => {
				return content.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
					const keys = path.trim().split('.');
					let value = item.json;
					
					for (const key of keys) {
						if (value && typeof value === 'object' && key in value) {
							value = value[key];
						} else {
							return match; // Return original if path not found
						}
					}
					
					return String(value);
				});
			};

			// Apply template replacements
			richContent.html = replaceTemplates(richContent.html);
			richContent.css = replaceTemplates(richContent.css);
			richContent.script = replaceTemplates(richContent.script);

			// Create output item
			const outputItem = {
				json: {
					...item.json,
					richContent: {
						html: richContent.html,
						css: richContent.css,
						script: richContent.script,
						sanitize: sanitize,
						contentType: contentType,
					},
				},
			};

			returnData.push(outputItem);
		}

		return [returnData];
	}
}

module.exports = {
	RichContentGenerator,
}; 