# n8n Fork - Neo Agent Platform

This is a customized fork of n8n for the Neo Agent AI Platform.

## Customizations

### Platform Integration
- LibreChat integration nodes
- Azure AD authentication
- Custom workflow templates
- Enhanced security features
- Azure Service Bus integration

### Environment Configuration
- Container deployment optimized
- Environment-specific configurations
- Health check endpoints
- Monitoring integration

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build custom nodes
npm run build:custom-nodes

# Run tests
npm test
```

### Custom Node Development
1. Create custom nodes in `packages/nodes-base/nodes/`
2. Test nodes locally
3. Build and package nodes
4. Deploy to development environment
5. Test integration with LibreChat

## Integration Points

### LibreChat Integration
- Custom nodes for LibreChat API
- Webhook triggers for chat messages
- Response handling nodes
- Context management nodes

### Azure Integration
- Azure AD authentication
- Azure Service Bus nodes
- Azure Key Vault integration
- Azure Monitor for logging

## Custom Nodes

### LibreChat Nodes
- **LibreChat Send Message**: Send messages to LibreChat
- **LibreChat Receive Message**: Receive messages from LibreChat
- **LibreChat Agent Registration**: Register workflows as agents
- **LibreChat Context Management**: Manage conversation context

### Azure Nodes
- **Azure Service Bus**: Send/receive messages
- **Azure Key Vault**: Retrieve secrets
- **Azure AD**: Authentication and authorization
- **Azure Monitor**: Logging and metrics

## Deployment

### Docker Deployment
```bash
# Build image
docker build -t n8n-custom .

# Run container
docker run -p 5678:5678 n8n-custom
```

### Azure Container Apps
The application is deployed to Azure Container Apps with:
- Auto-scaling configuration
- Health check endpoints
- Environment variable injection
- Private network endpoints

## Workflow Templates

### Agent Workflows
- **Customer Support Agent**: Handle customer inquiries
- **Data Processing Agent**: Process and analyze data
- **Notification Agent**: Send notifications and alerts
- **Integration Agent**: Connect external systems

### Integration Workflows
- **LibreChat-n8n Bridge**: Bridge communication between applications
- **Data Synchronization**: Sync data between systems
- **Event Processing**: Process system events
- **Reporting**: Generate reports and analytics

## Upstream Synchronization

### Sync with Upstream
```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream changes
git merge upstream/master

# Push to fork
git push origin master
```

### Customization Management
- Keep customizations in separate branches
- Document all changes
- Test thoroughly before merging
- Maintain compatibility with upstream

## Security

### Security Enhancements
- Enhanced authentication
- Workflow validation
- Execution limits
- Audit logging
- Access control

### Compliance
- Workflow approval process
- Execution logging
- Data protection
- Privacy controls

## Monitoring

### Health Checks
- `/healthz` - Application health
- `/metrics` - Performance metrics
- `/status` - Detailed status

### Logging
- Workflow execution logs
- Error tracking
- Performance monitoring
- Security event logging

## Workflow Management

### Development Workflow
1. Create workflow in development environment
2. Test with sample data
3. Validate security and performance
4. Deploy to staging environment
5. Test integration with LibreChat
6. Deploy to production

### Production Workflow
- Workflow approval process
- Version control
- Rollback procedures
- Monitoring and alerting

## Support

For issues related to this fork:
- Create issues in the fork repository
- Contact the Neo Agent development team
- Check the main documentation in the parent repository

## License

This fork maintains the same license as the original n8n project. 