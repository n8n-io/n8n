package main

import (
	"fmt"
	"github.com/test/go-no-tests/internal/config"
	"log"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	fmt.Printf("Application starting with config: %+v\n", cfg)

	if err := run(cfg); err != nil {
		log.Fatalf("Application error: %v", err)
	}
}

func run(cfg *config.Config) error {
	fmt.Printf("Running application on port %d\n", cfg.Port)
	fmt.Printf("Debug mode: %v\n", cfg.Debug)

	// Simulate some work
	for i := 0; i < 3; i++ {
		fmt.Printf("Processing item %d\n", i+1)
	}

	return nil
}
