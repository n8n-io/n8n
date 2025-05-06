# To fetch updated code
```
git fetch upstream
git checkout master  # Ensure you’re on the main branch
git merge upstream/master  # Merge the latest changes
```


# To build and push the image to AWS
```
docker build -t n8n -f docker/images/n8n-custom/Dockerfile .
docker tag n8n:latest 122610520345.dkr.ecr.ap-south-1.amazonaws.com/n8n:latest
aws ecr get-login-password --profile fnshift --region ap-south-1 | docker login --username AWS --password-stdin 122610520345.dkr.ecr.ap-south-1.amazonaws.com
docker push 122610520345.dkr.ecr.ap-south-1.amazonaws.com/n8n:latest
```


# Deploy workflow image
```
aws configure --profile fnshift
aws ecr get-login-password --profile fnshift --region ap-south-1 | docker login --username AWS --password-stdin 122610520345.dkr.ecr.ap-south-1.amazonaws.com
docker pull 122610520345.dkr.ecr.ap-south-1.amazonaws.com/n8n:latest
docker run -d --name n8n-container --env-file .env 122610520345.dkr.ecr.ap-south-1.amazonaws.com/n8n:latest
docker logs --follow n8n-container
```
