package main

import (
	"fmt"
	"log"

	"github.com/test/go-nested-packages/internal/server"
	"github.com/test/go-nested-packages/pkg/client"
)

func main() {
	fmt.Println("Starting nested packages application")

	// Initialize server
	srv := server.New(":8080")

	// Initialize client
	cli := client.New("http://localhost:8080")

	// Start server in background
	go func() {
		if err := srv.Start(); err != nil {
			log.Printf("Server error: %v", err)
		}
	}()

	// Use client
	if err := cli.Connect(); err != nil {
		log.Printf("Client error: %v", err)
	}

	fmt.Println("Application initialized")
}
