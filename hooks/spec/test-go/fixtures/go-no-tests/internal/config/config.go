package config

import (
	"os"
	"strconv"
)

// Config holds application configuration
type Config struct {
	Port    int
	Debug   bool
	AppName string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Port:    8080,
		Debug:   false,
		AppName: "go-no-tests",
	}

	if portStr := os.Getenv("PORT"); portStr != "" {
		port, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, err
		}
		cfg.Port = port
	}

	if debugStr := os.Getenv("DEBUG"); debugStr != "" {
		cfg.Debug = debugStr == "true" || debugStr == "1"
	}

	if appName := os.Getenv("APP_NAME"); appName != "" {
		cfg.AppName = appName
	}

	return cfg, nil
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.Port < 1 || c.Port > 65535 {
		return ErrInvalidPort
	}
	if c.AppName == "" {
		return ErrEmptyAppName
	}
	return nil
}

var (
	ErrInvalidPort  = configError("invalid port number")
	ErrEmptyAppName = configError("app name cannot be empty")
)

type configError string

func (e configError) Error() string {
	return string(e)
}
