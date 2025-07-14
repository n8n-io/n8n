# Rich Content Examples for n8n Chat Workflows

## Example 1: Simple HTML Response

**Code Node:**
```javascript
// Generate rich HTML response with custom styling
return [{
  json: {
    type: 'rich',
    content: {
      html: `
        <div class="weather-card">
          <h2>🌤️ Today's Weather</h2>
          <p class="temperature">72°F</p>
          <p class="description">Partly Cloudy</p>
          <div class="details">
            <span>Humidity: 45%</span>
            <span>Wind: 8 mph</span>
          </div>
        </div>
      `,
      css: `
        .weather-card {
          background: linear-gradient(135deg, #74b9ff, #0984e3);
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .temperature {
          font-size: 2.5em;
          font-weight: bold;
          margin: 10px 0;
        }
        .details {
          display: flex;
          justify-content: space-between;
          margin-top: 15px;
          font-size: 0.9em;
        }
      `,
      sanitize: 'basic'
    }
  }
}];
```

## Example 2: Interactive Components

**Code Node:**
```javascript
// Create interactive dashboard with buttons and data
return [{
  json: {
    type: 'rich',
    content: {
      html: `
        <div class="dashboard">
          <h3>📊 Sales Dashboard</h3>
          <div id="metrics"></div>
          <div id="actions"></div>
        </div>
      `,
      css: `
        .dashboard {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
        }
        .metric-card {
          display: inline-block;
          background: #f8f9fa;
          padding: 15px;
          margin: 5px;
          border-radius: 6px;
          text-align: center;
          min-width: 120px;
        }
        .metric-value {
          font-size: 1.5em;
          font-weight: bold;
          color: #28a745;
        }
      `,
      components: [
        {
          type: 'button',
          id: 'refresh-btn',
          props: {
            innerText: '🔄 Refresh Data',
            className: 'refresh-button'
          },
          events: {
            click: `
              console.log('Refreshing dashboard...');
              // Trigger workflow refresh
              window.parent.postMessage({
                type: 'chat-action',
                action: 'refresh-dashboard'
              }, '*');
            `
          },
          style: {
            backgroundColor: '#007acc',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }
      ],
      data: {
        sales: 15420,
        orders: 234,
        customers: 89,
        revenue: '$45,230'
      },
      script: `
        // Populate metrics dynamically
        const metrics = container.querySelector('#metrics');
        const actions = container.querySelector('#actions');
        
        // Create metric cards
        Object.entries(data).forEach(([key, value]) => {
          const card = document.createElement('div');
          card.className = 'metric-card';
          card.innerHTML = \`
            <div class="metric-label">\${key.toUpperCase()}</div>
            <div class="metric-value">\${value}</div>
          \`;
          metrics.appendChild(card);
        });
        
        console.log('Dashboard initialized with data:', data);
      `,
      sanitize: 'basic'
    }
  }
}];
```

## Example 3: Data Visualization

**Code Node:**
```javascript
// Generate chart with Chart.js
return [{
  json: {
    type: 'rich',
    content: {
      html: `
        <div class="chart-container">
          <h3>📈 Monthly Revenue Trend</h3>
          <canvas id="revenueChart" width="400" height="200"></canvas>
        </div>
      `,
      css: `
        .chart-container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
      `,
      data: {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        revenue: [12000, 15000, 18000, 22000, 25000, 28000]
      },
      script: `
        // Simple chart implementation (could use Chart.js in real scenario)
        const canvas = container.querySelector('#revenueChart');
        const ctx = canvas.getContext('2d');
        
        // Basic line chart drawing
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(padding, padding);
        ctx.stroke();
        
        // Draw data points and line
        const maxRevenue = Math.max(...data.revenue);
        const stepX = (width - 2 * padding) / (data.revenue.length - 1);
        const stepY = (height - 2 * padding) / maxRevenue;
        
        ctx.strokeStyle = '#007acc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.revenue.forEach((value, index) => {
          const x = padding + index * stepX;
          const y = height - padding - (value * stepY);
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          // Draw point
          ctx.fillStyle = '#007acc';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
        
        ctx.stroke();
        
        console.log('Chart rendered with data:', data);
      `,
      sanitize: 'none' // Allow full script execution for charts
    }
  }
}];
```

## Example 4: Form with User Input

**Code Node:**
```javascript
// Interactive form for user feedback
return [{
  json: {
    type: 'rich',
    content: {
      html: `
        <div class="feedback-form">
          <h3>💬 Feedback Form</h3>
          <form id="userFeedback">
            <div class="form-group">
              <label for="rating">Rating:</label>
              <select id="rating" name="rating">
                <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                <option value="4">⭐⭐⭐⭐ Good</option>
                <option value="3">⭐⭐⭐ Average</option>
                <option value="2">⭐⭐ Poor</option>
                <option value="1">⭐ Very Poor</option>
              </select>
            </div>
            <div class="form-group">
              <label for="comments">Comments:</label>
              <textarea id="comments" name="comments" rows="3" 
                        placeholder="Tell us what you think..."></textarea>
            </div>
            <button type="submit">Submit Feedback</button>
          </form>
        </div>
      `,
      css: `
        .feedback-form {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        .form-group {
          margin-bottom: 15px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        select, textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-family: inherit;
        }
        button[type="submit"] {
          background: #28a745;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button[type="submit"]:hover {
          background: #218838;
        }
      `,
      script: `
        const form = container.querySelector('#userFeedback');
        
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          
          const formData = new FormData(form);
          const feedback = {
            rating: formData.get('rating'),
            comments: formData.get('comments'),
            timestamp: new Date().toISOString()
          };
          
          console.log('Feedback submitted:', feedback);
          
          // Send to parent chat window
          window.parent.postMessage({
            type: 'chat-action',
            action: 'submit-feedback',
            data: feedback
          }, '*');
          
          // Show success message
          form.innerHTML = '<p style="color: green;">✅ Thank you for your feedback!</p>';
        });
      `,
      sanitize: 'basic'
    }
  }
}];
```

## Example 5: Streaming Rich Content

**For streaming responses, use the enhanced StructuredChunk format:**

```javascript
// In your streaming node
ctx.sendChunk('begin', itemIndex);

// Send rich content chunk
const richChunk = {
  type: 'rich-item',
  content: {
    html: '<div class="loading">Processing your request...</div>',
    css: '.loading { animation: pulse 1s infinite; }'
  },
  metadata: {
    nodeId: ctx.getNode().id,
    nodeName: ctx.getNode().name,
    timestamp: Date.now(),
    runIndex: 0,
    itemIndex
  }
};

ctx.sendChunk('rich-item', itemIndex, JSON.stringify(richChunk));

// Continue with more chunks...
ctx.sendChunk('end', itemIndex);
```

## Implementation Benefits

1. **Rich Interactions**: Buttons, forms, charts, and media
2. **Custom Styling**: Full CSS control with sanitization options
3. **Dynamic Content**: JavaScript execution in sandboxed environment
4. **Data Binding**: Structured data with template rendering
5. **Security**: Multiple sanitization levels for safe content
6. **Backward Compatibility**: Existing text-based workflows continue working

## Security Considerations

- **Sanitization Levels**: 'strict', 'basic', 'none' for different use cases
- **Script Sandboxing**: Limited execution context with controlled DOM access
- **CSS Filtering**: Removal of dangerous CSS properties
- **Event Isolation**: Controlled event handling with error boundaries 