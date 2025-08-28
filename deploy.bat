@echo off
REM n8n Local Deployment Script for Windows
REM This script helps you quickly deploy n8n locally for testing

echo 🚀 Starting n8n deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Create local-files directory if it doesn't exist
if not exist "local-files" (
    echo 📁 Creating local-files directory...
    mkdir local-files
)

REM Copy environment file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created. Please edit it with your configuration.
)

REM Start the containers
echo 🐳 Starting n8n containers...
docker-compose up -d

REM Wait for the service to be ready
echo ⏳ Waiting for n8n to be ready...
timeout /t 10 /nobreak >nul

REM Check if the service is running
curl -f http://localhost:5678/healthz >nul 2>&1
if errorlevel 1 (
    echo ❌ n8n failed to start. Check logs with: docker-compose logs n8n
    pause
    exit /b 1
) else (
    echo ✅ n8n is running successfully!
    echo 🌐 Access n8n at: http://localhost:5678
    echo 📊 View logs with: docker-compose logs -f n8n
    echo 🛑 Stop n8n with: docker-compose down
)

pause
